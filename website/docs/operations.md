---
title: Operations
---

## Release Pipeline (Desktop App)

Workflow: `.github/workflows/release.yml`

Trigger conditions:

- Git tags matching `v*`
- manual `workflow_dispatch`

### Build Matrix

- `macos-latest` producing `.dmg`
- `windows-latest` producing `.exe` (NSIS)

### Required Secrets

See `docs/release-operations.md` for complete operator guide. Required secret names include:

- `TAURI_PRIVATE_KEY`
- `TAURI_KEY_PASSWORD`
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD` or `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

### Release Assets

Published artifacts include:

- platform installer files
- `release-manifest.json`
- `checksums.txt`

Manifest/checksum generation script:

- `scripts/generate-release-manifest.mjs`

## Documentation Site Deployment (Vercel)

This docs site is intended for Vercel Git integration.

### Repository Layout

- Docs source root: `website/`
- Static build output: `website/build`

### Vercel Project Settings

Use a Vercel project pointed at this repository with:

- **Root Directory**: `website`
- **Build Command**: `npm run build`
- **Install Command**: `npm ci`
- **Output Directory**: `build`

A matching project config file is included at `website/vercel.json`.

### Reference Generation in CI

`npm run build` runs `generate:reference` first, so every Vercel build refreshes:

- source inventory
- function index

### Optional Deep Clone Note

Current docs config does **not** enable page last-update-time metadata.

If later enabling last-update-time metadata, add Vercel env var:

- `VERCEL_DEEP_CLONE=true`

## Operational Validation Checklist

- Desktop release workflow succeeds on both target OS jobs.
- Manifest and checksum assets appear in the GitHub Release.
- Vercel preview deployment succeeds for docs changes.
- Generated reference pages update automatically after source changes.
