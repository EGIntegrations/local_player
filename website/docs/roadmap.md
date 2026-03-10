---
title: Roadmap (Planned, Not Yet Implemented)
---

## Scope of This Page

This page documents planned capabilities drawn from repository planning documents.

These items are **not currently implemented** in active runtime code unless explicitly noted otherwise.

Primary planning sources:

- `docs/plans/2026-03-06-local-player-design.md`
- `docs/plans/2026-03-06-local-player-implementation.md`

## Planned Features

### Cloud Source Integrations

Planned but not shipped:

- AWS S3 track source integration
- Google Drive track source integration
- credential/auth flows and secure token storage workflows

Current codebase status:

- UI indicates cloud integration is coming soon
- no active S3/Drive command handlers or runtime playback URLs

### Expanded Error Recovery Policies

Design docs outline richer strategies for:

- network retries with backoff
- cloud auth expiration handling
- corruption recovery flows and rebuild prompts

Current codebase status:

- core error handling/toasts exist
- advanced cloud recovery flows are not implemented

### Additional Testing Layers

Planned:

- full backend Rust unit/integration suites
- broader E2E automation coverage for app workflows

Current codebase status:

- strong store/service/component tests in Vitest
- no end-to-end desktop test harness committed

## Change Control Guidance

When a roadmap item ships:

1. Move behavior details into implementation docs (`frontend`, `backend`, `endpoints`).
2. Update generated references if new files/functions are introduced.
3. Keep this page for only future or in-progress items.
