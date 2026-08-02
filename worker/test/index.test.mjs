import assert from 'node:assert';
import worker, { timingSafeEqual } from '../src/index.ts';

function createKVStub() {
  const store = new Map();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

async function runTests() {
  console.log('Running Worker tests...');

  // Test timingSafeEqual
  assert.strictEqual(timingSafeEqual('secret123', 'secret123'), true);
  assert.strictEqual(timingSafeEqual('secret123', 'wrong1234'), false);
  assert.strictEqual(timingSafeEqual('short', 'longerstring'), false);

  const env = {
    SYNC_KV: createKVStub(),
    SYNC_PASSPHRASE: 'correct-passphrase',
  };

  // 1. GET /health needing no auth
  {
    const req = new Request('http://localhost/health', { method: 'GET' });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.deepStrictEqual(data, { ok: true });
  }

  // 2. CORS preflight OPTIONS *
  {
    const req = new Request('http://localhost/state', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
    assert.strictEqual(res.headers.get('Access-Control-Allow-Methods'), 'GET, PUT, OPTIONS');
  }

  // 3. 401 on wrong passphrase
  {
    const req = new Request('http://localhost/state', {
      method: 'GET',
      headers: { Authorization: 'Bearer wrong-passphrase' },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 401);
  }

  // 4. 204 on empty state GET
  {
    const req = new Request('http://localhost/state', {
      method: 'GET',
      headers: { Authorization: 'Bearer correct-passphrase' },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 204);
  }

  // 5. 200 on valid PUT when empty (baseRevision 0)
  const validState = {
    schemaVersion: 3,
    tasks: [],
    sessions: [],
    settings: {},
    settingsUpdatedAt: 100,
  };

  {
    const req = new Request('http://localhost/state', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer correct-passphrase',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ baseRevision: 0, state: validState }),
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.revision, 1);
    assert.strictEqual(typeof data.updatedAt, 'number');
  }

  // 6. Revision-conflict 409 path returning server state
  {
    const req = new Request('http://localhost/state', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer correct-passphrase',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ baseRevision: 0, state: validState }),
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.revision, 1);
    assert.deepStrictEqual(data.state, validState);
  }

  // 7. Oversized body rejected (400)
  {
    const oversizedState = {
      schemaVersion: 3,
      tasks: [],
      sessions: [],
      hugeField: 'x'.repeat(6 * 1024 * 1024),
    };
    const req = new Request('http://localhost/state', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer correct-passphrase',
        'Content-Type': 'application/json',
        'Content-Length': String(6 * 1024 * 1024),
      },
      body: JSON.stringify({ baseRevision: 1, state: oversizedState }),
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 400);
  }

  // 8. Malformed body rejected (400)
  {
    const req = new Request('http://localhost/state', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer correct-passphrase',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ baseRevision: 1, state: { tasks: 'not-an-array' } }),
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 400);
  }

  console.log('All Worker tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Worker tests failed:', err);
  process.exit(1);
});
