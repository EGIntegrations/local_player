# Local Player

[![Release](https://img.shields.io/github/v/release/EGIntegrations/local_player?display_name=tag)](https://github.com/EGIntegrations/local_player/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/EGIntegrations/local_player/release.yml?label=release%20build)](https://github.com/EGIntegrations/local_player/actions/workflows/release.yml)
[![Stars](https://img.shields.io/github/stars/EGIntegrations/local_player?style=social)](https://github.com/EGIntegrations/local_player/stargazers)
[![Forks](https://img.shields.io/github/forks/EGIntegrations/local_player?style=social)](https://github.com/EGIntegrations/local_player/network/members)
[![Issues](https://img.shields.io/github/issues/EGIntegrations/local_player)](https://github.com/EGIntegrations/local_player/issues)

Local-first desktop music player built with Tauri + React + TypeScript.

## Download

- Latest releases: [GitHub Releases](https://github.com/EGIntegrations/local_player/releases)

## License Keys (For Users)

To use the app, you need a valid license key.

1. Buy Local Player from the official checkout page:
   - [Buy Local Player (Lemon Squeezy)](https://egisuite.lemonsqueezy.com/checkout/buy/8f791de3-2a7b-402e-bf64-7677348f3e19)
2. After purchase, Lemon Squeezy sends your license key by email.
3. You can also find your key on the Lemon Squeezy order page/account.
4. Open Local Player and paste the key into the activation screen.

If you already bought a license but cannot find your key, check:

- your email receipt from Lemon Squeezy
- your Lemon Squeezy customer portal/order page

## Development

Recommended IDE setup:

- [VS Code](https://code.visualstudio.com/)
- [Tauri VS Code extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

Run locally:

```bash
npm install
npx tauri dev
```

## Operations Docs

- Cross-OS release workflow: `.github/workflows/release.yml`
- Release operator guide: `docs/release-operations.md`
- Release manifest schema: `docs/release-manifest.schema.json`
- License operations guide: `docs/license-operations.md`
