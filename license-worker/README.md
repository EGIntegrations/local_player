# Local Player License Worker

Cloudflare Worker for Lemon Squeezy license actions:

- `POST /license/activate`
- `POST /license/validate`
- `POST /license/deactivate`
- `GET /health`

## Deploy

1. Install Wrangler:

```bash
npm i -g wrangler
```

2. Authenticate:

```bash
wrangler login
```

3. Set optional access token (recommended):

```bash
wrangler secret put WORKER_ACCESS_TOKEN
```

4. Deploy:

```bash
cd license-worker
wrangler deploy
```

5. Copy the deployed URL and set app env:

```bash
VITE_LICENSE_API_BASE=https://<your-worker>.workers.dev
```

If `WORKER_ACCESS_TOKEN` is set, the app should call the worker with an Authorization bearer token. You can add that in a follow-up hardening step.

## Request payloads

### Activate

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "instance_name": "local-player-<device-id>"
}
```

### Validate

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "instance_id": "instance-id-from-activate"
}
```

### Deactivate

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "instance_id": "instance-id-from-activate"
}
```

