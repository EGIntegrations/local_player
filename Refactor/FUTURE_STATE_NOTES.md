# FUTURE_STATE_NOTES

Audit date: 2026-03-17
Source basis: committed planning docs only (`website/docs/roadmap.md`, `docs/plans/2026-03-06-local-player-design.md`, `docs/plans/2026-03-06-local-player-implementation.md`).

## 1) Status Guardrail

These notes describe planned or aspirational state. They are not treated as currently implemented unless explicitly confirmed in code.

## 2) Planned Capability Themes

### Cloud Source Integrations (Planned)

Planned direction:
- AWS S3 as track source
- Google Drive as track source
- Track acquisition and playback URL workflows for cloud media

Current boundary:
- Existing runtime behavior remains local MP3-focused
- Current UI already indicates cloud is “coming soon”

### Credential/Auth Expansion (Planned)

Planned direction:
- Cloud provider credential flows
- Secure credential/token storage workflows
- Expiration and re-auth handling patterns

Potential auth model expansion:
- Product license gating remains
- Additional provider auth layers likely become additive (S3 credentials and Drive OAuth)

### Error Recovery Expansion (Planned)

Planned direction includes:
- richer network retry behavior
- backoff policies
- cloud auth-expiration recovery flows
- corruption/rebuild prompts

### Testing Expansion (Planned)

Planned direction:
- broader Rust backend unit/integration coverage
- stronger end-to-end desktop workflow coverage

Current baseline:
- Existing Vitest coverage around stores/services/components is present
- no committed desktop E2E harness in current runtime tree

## 3) Likely Deployment/Operations Evolution

If planned cloud capabilities ship, likely operational additions include:
- additional runtime env vars and secret management for cloud providers
- potential new backend command surfaces in Rust for cloud playback/listing
- updated operator playbooks for cloud credential rotation and auth incident handling
- increased release validation matrix for cloud-enabled paths

## 4) Domain and Integration Expansion Expectations

Based on planning docs, likely future external integrations/domains may include:
- AWS service domains for S3 operations
- Google OAuth/Drive endpoints for Drive operations

These are planning-level expectations only; current committed runtime does not expose these integrations.

## 5) Documentation Control Notes

When future capabilities ship, expected documentation migration path:
- move shipped behavior from roadmap/plans into current-state implementation docs
- keep roadmap focused on not-yet-shipped work
- update env var, deployment, and auth sections to reflect concrete code paths only
