# CHANGE_IMPACT

Audit date: 2026-03-17
Purpose: impact map for likely upcoming work using current repository state as baseline.

## 1) Baseline Impact Summary

Current system is stable around local playback + license gating + GitHub release distribution + docs hosting. Highest-impact future work would come from cloud source integrations and auth hardening.

## 2) Impact Matrix

| Change Area | Primary Code Surfaces | Deployment/Infra Impact | Env/Auth Impact | Risk Level |
| --- | --- | --- | --- | --- |
| Add S3 runtime integration | `src-tauri/src/commands/*`, frontend stores/services/components, DB usage of `source='s3'` | likely new secrets handling + release validation updates | new provider creds/tokens, possible keychain/storage requirements | High |
| Add Google Drive runtime integration | Rust command layer + frontend orchestration + settings UX | OAuth callback/runtime wiring considerations | introduces OAuth token lifecycle and re-auth flows | High |
| Harden license worker access | `license-worker/src/index.ts`, app license service, operator docs | Worker secret policy changes and rollout sequencing | mandatory `WORKER_ACCESS_TOKEN` + `VITE_LICENSE_API_TOKEN` synchronization | Medium |
| Handle file deletion events end-to-end | Rust watcher event consumer in frontend + DB delete path | none or minimal infra changes | no new auth/env requirements | Medium |
| Reduce file capability scope | `src-tauri/capabilities/default.json` and command access patterns | packaging/runtime permission validation across OS | no direct auth change | Medium |
| Unify versioning metadata | `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, release process docs | lower operational friction in release pipeline | no auth change | Low |

## 3) Detailed Impact Notes

### A) Cloud Integration Work (S3/Drive)

Affected components:
- frontend settings UX and state
- playback source selection logic
- Rust command surface and potentially new modules
- operational docs and release validation steps

Expected side effects:
- larger failure surface (network, auth expiry, provider errors)
- additional observability/troubleshooting requirements
- higher burden for secure secret/token handling

### B) Licensing/Auth Hardening

Affected components:
- worker auth enforcement behavior
- app startup/license validation path
- CI/release secret management and local-dev setup docs

Expected side effects:
- stricter configuration requirements in dev/CI
- lower unauthorized call risk if token enforcement becomes mandatory

### C) Storage/Runtime Consistency Improvements

Affected components:
- local DB sync behavior for file delete/move scenarios
- Tauri capability restrictions
- release metadata/version alignment

Expected side effects:
- fewer stale-record and operator-traceability issues
- potential regression risk if permission tightening blocks legitimate file access paths

## 4) Operational Change Risk Concentrators

1. Cross-component coupling
- Playback, settings, Rust bridge, and release operations are tightly coupled in cloud/auth feature work.

2. Secrets lifecycle
- New auth surfaces increase rotation, scoping, and environment drift risks across local dev, CI, and production worker deployment.

3. Documentation drift
- Existing roadmap/current-state separation is strong; drift risk increases if shipped behavior is not promoted out of roadmap notes quickly.

## 5) Recommended Impact Tracking Fields (for future tickets)

For each proposed change, track:
- deployment touchpoints (`GitHub Actions`, `Cloudflare Worker`, `Vercel`, desktop packaging)
- new/changed env vars and secret owners
- auth boundary changes (license-only vs provider auth)
- data migration or schema effects
- rollback path and operator playbook deltas
