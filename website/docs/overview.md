---
title: Overview
---

## Purpose

This site documents the **Local Player** desktop application in this repository (`EGIntegrations/local_player`).

It is intended to be implementation-first:

- Current code paths are documented as authoritative behavior.
- Planned/unshipped ideas are isolated in [Roadmap](./roadmap.md).

## System Summary

Local Player is a desktop MP3 player built with Tauri 2 + React + TypeScript + Rust.

| Area | Implementation |
| --- | --- |
| Frontend runtime | React 19 + Vite 7 + Zustand stores |
| Audio engine | Howler.js + Web Audio API analyser/equalizer chain |
| Desktop bridge | Tauri `invoke` commands + event listeners |
| Backend runtime | Rust + Tauri plugins |
| Persistence | SQLite via `@tauri-apps/plugin-sql` with migrations from Rust |
| Release distribution | GitHub Actions workflow + GitHub Release assets + manifest/checksum generation |
| Docs hosting | Vercel static hosting (this documentation website) |

## Documentation Map

- [Getting Started](./getting-started.md): prerequisites, run, test, build.
- [Architecture](./architecture.md): runtime boundaries and lifecycle flow.
- [Frontend](./frontend.md): components, stores, services, theming.
- [Backend](./backend.md): Rust commands, watcher, plugin wiring.
- [Data Model](./data-model.md): SQLite schema, settings keys, release manifest schema.
- [Endpoints & Interfaces](./endpoints-interfaces.md): command/event/API contracts.
- [Operations](./operations.md): CI/release operations and Vercel deployment.
- [Roadmap](./roadmap.md): planned capabilities not implemented in code.
- [Reference](./reference/source-inventory.md): generated source and function indexes.

## Source of Truth

Primary implementation paths:

- Frontend app: `src/`
- Desktop backend: `src-tauri/src/`
- Release pipeline: `.github/workflows/release.yml`
- Existing project docs: `docs/`

Reference docs on this site are regenerated from tracked repository files using `website/scripts/generate-reference.mjs`.
