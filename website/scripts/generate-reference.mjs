#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {promises as fs} from 'node:fs';
import path from 'node:path';

const WEBSITE_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEBSITE_ROOT, '..');
const OUTPUT_DIR = path.join(WEBSITE_ROOT, 'docs', 'reference');
const REPO_BLOB_BASE = 'https://github.com/EGIntegrations/local_player/blob/main';

const reservedWords = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'return',
  'new',
  'typeof',
  'await',
  'throw',
  'delete',
  'else',
  'do',
  'try',
]);

function isCodeFile(filePath) {
  return /\.(ts|tsx|js|jsx|mjs|cjs|rs)$/.test(filePath);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryFor(filePath) {
  if (filePath.startsWith('src-tauri/')) return 'Backend';
  if (filePath.startsWith('src/')) return 'Frontend App';
  if (filePath.startsWith('tests/')) return 'Tests';
  if (filePath.startsWith('docs/')) return 'Project Docs';
  if (filePath.startsWith('website/')) return 'Docs Site';
  if (filePath.startsWith('.github/')) return 'CI/CD';
  if (filePath.startsWith('scripts/')) return 'Scripts';
  if (filePath.startsWith('public/') || filePath.includes('/icons/')) return 'Assets';
  return 'Config/Other';
}

function extractSymbols(filePath, sourceText) {
  const symbols = [];
  const lines = sourceText.split(/\r?\n/);
  let pendingTauriCommand = false;

  const pushSymbol = (name, kind, lineNumber) => {
    if (!name || reservedWords.has(name)) return;
    symbols.push({
      name,
      kind,
      filePath,
      lineNumber,
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (/^\s*#\[tauri::command\]/.test(line)) {
      pendingTauriCommand = true;
      continue;
    }

    // Rust functions
    const rustMatch = line.match(/^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (rustMatch) {
      pushSymbol(
        rustMatch[1],
        pendingTauriCommand ? 'tauri command (rust fn)' : 'rust fn',
        lineNumber,
      );
      pendingTauriCommand = false;
      continue;
    }

    pendingTauriCommand = false;

    // JS/TS exported function declarations
    const exportedFunction = line.match(/^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (exportedFunction) {
      pushSymbol(exportedFunction[1], 'exported function', lineNumber);
      continue;
    }

    // JS/TS function declarations
    const functionDeclaration = line.match(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (functionDeclaration) {
      pushSymbol(functionDeclaration[1], 'function', lineNumber);
      continue;
    }

    // JS/TS class declarations
    const classDeclaration = line.match(/^\s*export\s+class\s+([A-Za-z_$][\w$]*)/)
      ?? line.match(/^\s*class\s+([A-Za-z_$][\w$]*)/);
    if (classDeclaration) {
      pushSymbol(classDeclaration[1], 'class', lineNumber);
      continue;
    }

    // JS/TS const arrow/function expressions
    const constCallable = line.match(
      /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\(|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/,
    );
    if (constCallable) {
      pushSymbol(constCallable[1], 'const callable', lineNumber);
      continue;
    }

    // Class methods (conservative heuristic)
    const methodMatch = line.match(
      /^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*(?::[^=]+)?\s*\{/,
    );
    if (methodMatch && !reservedWords.has(methodMatch[1])) {
      pushSymbol(methodMatch[1], 'method', lineNumber);
    }
  }

  return symbols;
}

async function main() {
  const trackedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const inventory = [];
  const symbols = [];

  for (const relativePath of trackedFiles) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    let stat;

    try {
      stat = await fs.stat(absolutePath);
    } catch {
      continue;
    }

    if (!stat.isFile()) continue;

    const buffer = await fs.readFile(absolutePath);
    const isBinary = buffer.includes(0);
    let lineCount = '-';

    if (!isBinary) {
      const text = buffer.toString('utf8');
      lineCount = String(text.split(/\r?\n/).length);
      if (isCodeFile(relativePath)) {
        symbols.push(...extractSymbols(relativePath, text));
      }
    }

    inventory.push({
      relativePath,
      category: categoryFor(relativePath),
      lineCount,
      size: formatBytes(stat.size),
    });
  }

  const timestamp = new Date().toISOString();

  const inventoryLines = inventory.map(
    (entry) => `| \`${entry.relativePath}\` | ${entry.category} | ${entry.lineCount} | ${entry.size} |`,
  );

  const inventoryMarkdown = `---\ntitle: Source Inventory\n---\n\nGenerated: ${timestamp}\n\nTracked file count: **${inventory.length}**\n\n| File | Category | Lines | Size |\n| --- | --- | ---: | ---: |\n${inventoryLines.join('\n')}\n`;

  const sortedSymbols = symbols
    .sort((a, b) => {
      if (a.filePath === b.filePath) return a.lineNumber - b.lineNumber;
      return a.filePath.localeCompare(b.filePath);
    })
    .map((entry) => {
      const link = `${REPO_BLOB_BASE}/${entry.filePath}#L${entry.lineNumber}`;
      return `| \`${entry.name}\` | ${entry.kind} | [\`${entry.filePath}:${entry.lineNumber}\`](${link}) |`;
    });

  const functionMarkdown = `---\ntitle: Function Index\n---\n\nGenerated: ${timestamp}\n\nCode files scanned: **${inventory.filter((entry) => isCodeFile(entry.relativePath)).length}**  \nDetected symbols: **${sortedSymbols.length}**\n\n| Symbol | Kind | Location |\n| --- | --- | --- |\n${sortedSymbols.join('\n')}\n`;

  await fs.mkdir(OUTPUT_DIR, {recursive: true});
  await fs.writeFile(path.join(OUTPUT_DIR, 'source-inventory.md'), inventoryMarkdown, 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'function-index.md'), functionMarkdown, 'utf8');

  process.stdout.write(
    `Generated reference docs for ${inventory.length} files and ${sortedSymbols.length} symbols.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
