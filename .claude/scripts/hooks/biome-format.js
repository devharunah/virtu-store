#!/usr/bin/env node
/**
 * PostToolUse hook - format the edited file with Biome.
 *
 * The upstream everything-claude-code hook shells out to Prettier. This repo
 * formats with Biome (`biome.json`, `pnpm run biome:check`), so a Prettier pass
 * would rewrite the file into a shape `pnpm run ci` then rejects.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const FORMATTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|json|jsonc|css)$/;

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
  const input = await readInput();
  const filePath = input?.tool_input?.file_path;

  if (!filePath || !FORMATTABLE.test(filePath) || !fs.existsSync(filePath)) return;
  if (filePath.split(path.sep).includes('node_modules')) return;

  try {
    execFileSync('pnpm', ['exec', 'biome', 'check', '--write', filePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      shell: process.platform === 'win32',
    });
  } catch {
    // Formatting is advisory. Never fail the tool call on it.
  }
}

main().finally(() => process.exit(0));
