#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args.set(key, 'true');
      continue;
    }
    args.set(key, value);
    i += 1;
  }
  return args;
}

function inferOs(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('-macos-') || lower.endsWith('.dmg') || lower.includes('.app.tar.gz')) {
    return 'macos';
  }
  if (lower.includes('-windows-') || lower.endsWith('.msi') || lower.endsWith('.exe')) {
    return 'windows';
  }
  return 'unknown';
}

function inferArch(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('aarch64') || lower.includes('arm64')) return 'arm64';
  if (lower.includes('x86_64') || lower.includes('x64') || lower.includes('amd64')) return 'x64';
  return 'unknown';
}

async function sha256(filePath) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = args.get('input') ?? 'release-assets';
  const outputPath = args.get('output') ?? path.join(inputDir, 'release-manifest.json');
  const checksumsPath = args.get('checksums') ?? path.join(inputDir, 'checksums.txt');
  const version = args.get('version');
  const baseUrl = args.get('base-url') ?? '';

  if (!version) {
    throw new Error('Missing required --version argument');
  }

  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.endsWith('.json') && !name.endsWith('.txt'));

  const artifacts = [];
  for (const fileName of files.sort()) {
    const filePath = path.join(inputDir, fileName);
    const digest = await sha256(filePath);
    artifacts.push({
      os: inferOs(fileName),
      arch: inferArch(fileName),
      fileName,
      sha256: digest,
      downloadUrl: baseUrl ? `${baseUrl}/${fileName}` : fileName,
    });
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    version,
    artifacts,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const checksumLines = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.fileName}`);
  await fs.writeFile(checksumsPath, `${checksumLines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${artifacts.length} artifacts to ${outputPath}`);
  console.log(`Wrote checksums to ${checksumsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
