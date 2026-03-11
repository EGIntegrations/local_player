# License Operations (Lemon Squeezy + Cloudflare Worker)

## App behavior

The desktop app now enforces license activation at startup.

- First launch: prompts for license key.
- Activated state: stored locally in SQLite settings.
- Startup: validates against Worker endpoint.
- Offline grace: 7 days after last successful validation.

Settings keys used:

- `license_key`
- `license_email`
- `license_instance_id`
- `license_device_id`
- `license_last_validated_at`

## 1) Deploy Worker

Worker source: `license-worker/`

```bash
cd license-worker
wrangler deploy
```

Optional secret:

```bash
wrangler secret put WORKER_ACCESS_TOKEN
```

## 2) App environment

Set this before `npm run tauri dev` or CI build:

- `VITE_LICENSE_API_BASE=https://<your-worker>.workers.dev`
- Optional (if Worker secret is set): `VITE_LICENSE_API_TOKEN=<same token as WORKER_ACCESS_TOKEN>`

## 3) Runtime flow

1. App calls `POST /license/activate` with `license_key` + `instance_name`.
2. Worker forwards to Lemon Squeezy `/v1/licenses/activate`.
3. App stores returned `instance_id`.
4. App calls `POST /license/validate` on startup.
5. App can call `POST /license/deactivate` to clear local activation.

## 4) Troubleshooting

- `VITE_LICENSE_API_BASE is not set`: add env var and restart app.
- `license_key is required`: check payload from app.
- `instance_id is required for deactivation`: activate first.
- If Worker returns 4xx/5xx, inspect Worker logs:

```bash
wrangler tail
```
