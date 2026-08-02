# Study Tracker Sync Worker

Cloudflare Worker providing cross-device synchronization for Study Tracker via optimistic concurrency control and KV storage.

## Deployment Guide

Follow these steps in order to deploy your Worker to Cloudflare:

### 1. Authenticate with Cloudflare
If you haven't already logged into Wrangler, run:
```bash
npx wrangler login
```

### 2. Create the KV Namespace
Create a KV namespace named `SYNC_KV`:
```bash
npx wrangler kv namespace create SYNC_KV
```
Copy the `id` returned by the command and paste it into `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SYNC_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

### 3. Set your Passphrase Secret
Set the secret passphrase (do NOT write passphrase secrets into `wrangler.toml`):
```bash
npx wrangler secret put SYNC_PASSPHRASE
```
When prompted, enter a strong passphrase. You will enter this same passphrase in the Study Tracker Settings UI.

### 4. Test Locally (Optional)
Run the worker locally:
```bash
npx wrangler dev
```

### 5. Deploy to Cloudflare
Deploy the worker:
```bash
npx wrangler deploy
```
Once deployed, copy your worker's URL (e.g. `https://study-tracker-sync.<your-subdomain>.workers.dev`) and paste it into Study Tracker > Settings > Cross-Device Sync.
