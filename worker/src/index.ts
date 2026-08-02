export interface Env {
  SYNC_KV: KVNamespace;
  SYNC_PASSPHRASE?: string;
}

const ALLOWED_ORIGINS = new Set([
  'https://george1-adel.github.io',
  'http://localhost:5173',
]);

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const RATE_LIMIT_TTL_SECONDS = 60;

export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
  }
  return mismatch === 0;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

async function checkRateLimit(ip: string, env: Env): Promise<boolean> {
  const rateKey = `rate:${ip}`;
  try {
    const raw = await env.SYNC_KV.get(rateKey);
    const count = raw ? parseInt(raw, 10) : 0;
    return count >= RATE_LIMIT_MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

async function recordFailedAttempt(ip: string, env: Env): Promise<void> {
  const rateKey = `rate:${ip}`;
  try {
    const raw = await env.SYNC_KV.get(rateKey);
    const count = raw ? parseInt(raw, 10) : 0;
    await env.SYNC_KV.put(rateKey, String(count + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
  } catch {
    // Ignore KV write failure during rate limit recording
  }
}

function checkAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.slice(7);
  const secret = env.SYNC_PASSPHRASE ?? '';
  if (!secret) return false;
  return timingSafeEqual(token, secret);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);
    const url = new URL(request.url);

    // OPTIONS CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // GET /health
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Rate Limiting check for state endpoints
    const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
    if (await checkRateLimit(clientIp, env)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Auth verification for /state endpoints
    if (url.pathname === '/state') {
      if (!checkAuth(request, env)) {
        await recordFailedAttempt(clientIp, env);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      if (request.method === 'GET') {
        const rawDoc = await env.SYNC_KV.get('state:default');
        if (!rawDoc) {
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });
        }

        try {
          const doc = JSON.parse(rawDoc);
          return new Response(JSON.stringify(doc), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        } catch {
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });
        }
      }

      if (request.method === 'PUT') {
        // Size Cap Check
        const contentLength = request.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
          return new Response(JSON.stringify({ error: 'Payload too large' }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        let bodyText: string;
        try {
          bodyText = await request.text();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid body' }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        if (bodyText.length > MAX_PAYLOAD_SIZE) {
          return new Response(JSON.stringify({ error: 'Payload too large' }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        // Body Structure Validation
        if (
          !body ||
          typeof body !== 'object' ||
          typeof body.baseRevision !== 'number' ||
          !body.state ||
          typeof body.state !== 'object' ||
          !Array.isArray((body.state as Record<string, unknown>).tasks) ||
          !Array.isArray((body.state as Record<string, unknown>).sessions)
        ) {
          return new Response(JSON.stringify({ error: 'Invalid state structure' }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }

        // Optimistic Concurrency Control
        const rawCurrent = await env.SYNC_KV.get('state:default');
        let currentDoc: { revision: number; updatedAt: number; state: unknown } | null = null;
        if (rawCurrent) {
          try {
            currentDoc = JSON.parse(rawCurrent);
          } catch {
            currentDoc = null;
          }
        }

        const currentRevision = currentDoc ? currentDoc.revision : 0;

        if (body.baseRevision !== currentRevision) {
          // Conflict 409
          return new Response(
            JSON.stringify({
              revision: currentRevision,
              updatedAt: currentDoc ? currentDoc.updatedAt : 0,
              state: currentDoc ? currentDoc.state : null,
            }),
            {
              status: 409,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Match: Increment revision and persist
        const newRevision = currentRevision + 1;
        const updatedAt = Date.now();
        const newDoc = {
          revision: newRevision,
          updatedAt,
          state: body.state,
        };

        await env.SYNC_KV.put('state:default', JSON.stringify(newDoc));

        return new Response(JSON.stringify({ revision: newRevision, updatedAt }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 444,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  },
};
