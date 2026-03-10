---
title: Getting Started
---

## Prerequisites

From the current repository setup and CI workflow:

- Node.js 22 (CI uses `actions/setup-node@v4` with `node-version: 22`)
- npm
- Rust toolchain (for Tauri backend build)
- OS dependencies required by Tauri for your platform

## Install and Run the App

From repo root:

```bash
npm install
npm run dev
```

Desktop app development:

```bash
npm run tauri dev
```

Production frontend bundle:

```bash
npm run build
```

## Run Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Build Desktop Artifacts

```bash
npm run tauri build
```

Release workflow (`.github/workflows/release.yml`) builds:

- macOS: `.dmg`
- Windows: `.exe` (NSIS)

## Build Documentation Site

From `website/`:

```bash
npm ci
npm run build
```

`npm run build` runs both:

1. `npm run generate:reference`
2. static site compilation step

This ensures generated reference pages stay aligned with repository contents.
