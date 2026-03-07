# Release Operations (macOS + Windows)

This repository ships desktop artifacts for macOS and Windows and publishes a machine-readable manifest for your external website.

## 1) Required repository secrets

Add these in GitHub repository settings:

- `TAURI_PRIVATE_KEY`
- `TAURI_KEY_PASSWORD`

Optional (if you later enable platform code signing/notarization):

- macOS notarization/signing secrets
- Windows code-signing certificate secrets

## 2) Versioning and tag

1. Update `src-tauri/tauri.conf.json` `version`.
2. Commit changes.
3. Create and push a tag in the format `vX.Y.Z`.

## 3) CI workflow behavior

Workflow file: `.github/workflows/release.yml`

- Builds on `macos-latest` and `windows-latest`.
- Produces standardized artifact names:
  - `local-player-<version>-macos-<original>`
  - `local-player-<version>-windows-<original>`
- Generates:
  - `release-manifest.json`
  - `checksums.txt`
- Publishes all assets to the matching GitHub Release.

## 4) Manifest contract

Schema: `docs/release-manifest.schema.json`

Manifest includes:

- `version`
- per-artifact `os`, `arch`, `fileName`, `sha256`, `downloadUrl`

Use this manifest in your external website/backend to map OS-specific download buttons and verify checksum integrity.
