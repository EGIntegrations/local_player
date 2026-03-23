# CURRENT_STATE

Audit date: 2026-03-17
Repository: `EGIntegrations/local_player`
Scope: current behavior and committed infrastructure only (no refactor proposals in this file).

## 1) System Snapshot

Local Player is a Tauri 2 desktop app with a React/TypeScript frontend and a Rust backend bridge.

Current runtime layers:
- Frontend UI + audio orchestration: `src/`
- Rust bridge + filesystem commands + watcher + migration registration: `src-tauri/src/`
- Local persistence: SQLite (`sqlite:local_player.db`) via `@tauri-apps/plugin-sql`
- Licensing surface: frontend license gate + Cloudflare Worker relay to Lemon Squeezy
- Documentation site: Docusaurus in `website/`, deployed to Vercel

## 2) Deployment Details

### Desktop App Release Deployment

Source of truth: `.github/workflows/release.yml`

Current release behavior:
- Trigger: git tags matching `v*` and manual `workflow_dispatch`
- Build matrix:
  - `macos-latest` -> `.dmg`
  - `windows-latest` -> `.exe` (NSIS)
- Asset naming format:
  - `local-player-<version>-macos-<original>`
  - `local-player-<version>-windows-<original>`
- Publish target: GitHub Releases via `softprops/action-gh-release@v2`
- Additional generated artifacts:
  - `release-manifest.json`
  - `checksums.txt`

Manifest/checksum generation:
- Script: `scripts/generate-release-manifest.mjs`
- Base URL contract in CI:
  - `https://github.com/${GITHUB_REPOSITORY}/releases/download/${GITHUB_REF_NAME}`

### License Worker Deployment

Source of truth: `license-worker/`

Current worker deployment model:
- Platform: Cloudflare Workers
- Entrypoint: `license-worker/src/index.ts`
- Config: `license-worker/wrangler.toml`
- Exposed endpoints:
  - `POST /license/activate`
  - `POST /license/validate`
  - `POST /license/deactivate`
  - `GET /health`

### Documentation Site Deployment

Source of truth: `website/`

Current docs deployment model:
- Static site generator: Docusaurus 3
- Hosting target: Vercel
- Config file: `website/vercel.json`
- Required Vercel root/output assumptions:
  - Root directory: `website`
  - Build command: `npm run build`
  - Install command: `npm ci`
  - Output directory: `build`

## 3) Environment Variables Referenced

### Runtime/Application

- `VITE_LICENSE_API_BASE` (required for production licensing)
  - Referenced in: `src/services/licenseService.ts`, `src/components/license/LicenseGate.tsx`
  - Purpose: base URL for Worker license endpoints.

- `VITE_LICENSE_API_TOKEN` (optional)
  - Referenced in: `src/services/licenseService.ts`
  - Purpose: `Authorization: Bearer <token>` header to Worker when Worker access token is enabled.

- `TAURI_DEV_HOST` (dev-only)
  - Referenced in: `vite.config.ts`
  - Purpose: Tauri/Vite host and HMR host wiring during desktop dev.

- `import.meta.env.DEV` (Vite runtime flag)
  - Referenced in: `src/components/license/LicenseGate.tsx`
  - Purpose: allows a dev-mode bypass path when license API base is not configured.

### CI/Release Secrets

Referenced in `.github/workflows/release.yml`:
- `TAURI_PRIVATE_KEY`
- `TAURI_KEY_PASSWORD`
- `VITE_LICENSE_API_BASE`
- `VITE_LICENSE_API_TOKEN`
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD` or `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

### Worker Environment

- `LEMON_SQUEEZY_API_BASE` (defaults to `https://api.lemonsqueezy.com`)
  - Referenced in: `license-worker/wrangler.toml`, `license-worker/src/index.ts`

- `WORKER_ACCESS_TOKEN` (optional secret)
  - Referenced in: `license-worker/src/index.ts`
  - Purpose: protects worker endpoints with bearer token.

### Docs Build Optional

- `VERCEL_DEEP_CLONE=true` (optional, docs note)
  - Mentioned in: `website/docs/operations.md`
  - Purpose: only relevant if enabling git last-update metadata.

## 4) Domain and URL Assumptions

Current hardcoded or contract-level assumptions:
- GitHub repository ownership/path: `https://github.com/EGIntegrations/local_player`
- Release download pattern uses GitHub Releases URL contract
- Lemon Squeezy checkout link in root README is fixed to an `egisuite.lemonsqueezy.com` checkout URL
- Lemon Squeezy API base default: `https://api.lemonsqueezy.com`
- Worker base expected to be a Cloudflare `*.workers.dev` URL (`VITE_LICENSE_API_BASE` guidance)
- Docs site canonical URL set to `https://local-player-docs.vercel.app` in Docusaurus config
- Release manifest schema `$id` points to `https://local-player.dev/schemas/release-manifest.schema.json`
- Local dev assumption for app frontend: `http://localhost:1420` (`src-tauri/tauri.conf.json`)

## 5) Integrations (Current)

Implemented integrations in active code:
- Tauri command bridge (`scan_folder`, `read_file_bytes`, `read_file_header`, `start_watching_folder`)
- Tauri plugins:
  - dialog
  - fs
  - opener
  - sql (sqlite migrations)
- Howler.js + Web Audio API for playback/analyzer/equalizer
- Cloudflare Worker relay for licensing
- Lemon Squeezy license endpoints via worker
- GitHub Actions + GitHub Releases for artifact distribution
- Vercel for docs hosting

Not implemented in current runtime (despite roadmap/plans/types):
- AWS S3 playback flow
- Google Drive playback flow

## 6) Auth and License Model

Current auth posture is product-license auth (not user identity auth):
- App is gated by `LicenseGate` at startup (`src/App.tsx`)
- Activation/validation/deactivation calls worker endpoints
- Local settings keys used for license state:
  - `license_key`
  - `license_email`
  - `license_instance_id`
  - `license_device_id`
  - `license_last_validated_at`
- Offline grace behavior: 7 days from last successful validation
- Worker authorization is optional and token-based (`WORKER_ACCESS_TOKEN`)
- If worker token is configured, app can send bearer token via `VITE_LICENSE_API_TOKEN`

## 7) Persistence and Data Boundaries

Current local DB schema (`src-tauri/src/db/schema.sql`):
- `tracks`
- `playlists`
- `playlist_tracks`
- `settings`

Notable behavior:
- Track `source` currently supports enum values `local | s3 | drive` at schema/type level
- Active file import and playback are local MP3-centric
- Folder watcher emits `file-created` and `file-deleted`; frontend currently subscribes only to `file-created`

## 8) Current Risks

1. Worker endpoint exposure risk
- Worker CORS is `*` and auth enforcement is optional. If `WORKER_ACCESS_TOKEN` is unset, endpoints are publicly callable.

2. Local license secret-at-rest risk
- License key and related fields are stored in local SQLite settings table as plain string values.

3. Dev-mode licensing bypass risk
- In dev (`import.meta.env.DEV`) with missing license API base, gate allows access; acceptable for development but should be documented for release hygiene.

4. File capability scope risk
- Tauri capability config allows broad file read (`fs:read-all` plus allow-read `**`), increasing blast radius if frontend command usage is compromised.

5. Stale-library drift risk
- Rust emits `file-deleted`, but frontend has no deletion handler, so removed files can remain in DB/UI until manual cleanup.

6. Version synchronization risk
- Version fields are not aligned across metadata files (`package.json` 0.1.0, `src-tauri/Cargo.toml` 0.1.0, `src-tauri/tauri.conf.json` 0.1.1), which can complicate release traceability.

7. Incomplete cloud-source expectations risk
- UI/type/schema expose `s3`/`drive` concepts, but runtime handlers are not shipped, which may create operator/user expectation mismatch.
