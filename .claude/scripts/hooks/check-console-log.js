#!/usr/bin/env node
/**
 * Warn about console.log left behind.
 *
 * Two modes:
 *   (no flag)  PostToolUse - scan the file that was just edited
 *   --diff     Stop - scan every changed source file in the working tree
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');

const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const MAX_REPORTED = 5;

function hits(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => /console\.log\s*\(/.test(text));
}

function report(filePath, found) {
  if (!found.length) return;
  console.error(`[Hook] console.log in ${filePath}`);
  for (const { line, text } of found.slice(0, MAX_REPORTED)) {
    console.error(`[Hook]   ${line}: ${text}`);
  }
  console.error('[Hook] Remove it before committing.');
}

function readInput() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
  });
}

async function main() {
  if (process.argv.includes('--diff')) {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    } catch {
      return;
    }
    const changed = execSync('git diff --name-only HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      .split('\n')
      .filter((file) => SOURCE.test(file));
    for (const file of changed) report(file, hits(file));
    return;
  }

  const input = await readInput();
  const filePath = input?.tool_input?.file_path;
  if (filePath && SOURCE.test(filePath)) report(filePath, hits(filePath));
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
