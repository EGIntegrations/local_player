# Local Player Documentation Site

This directory contains the Local Player documentation website.

## Commands

```bash
npm ci
npm run generate:reference
npm run build
npm run start
```

## Build Behavior

`npm run build` executes:

1. `npm run generate:reference`
2. static site build

Generated reference pages:

- `docs/reference/source-inventory.md`
- `docs/reference/function-index.md`

## Vercel Setup

In Vercel project settings, set:

- Root Directory: `website`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `build`
