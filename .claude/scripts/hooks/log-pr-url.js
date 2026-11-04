#!/usr/bin/env node
/**
 * PostToolUse hook - after `gh pr create`, surface the PR URL and the command
 * to review it, so the URL does not scroll away in build output.
 */

const PR_URL = /https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/pull\/(\d+)/;

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

readInput()
  .then((input) => {
    const command = input?.tool_input?.command || '';
    if (!/gh pr create/.test(command)) return;

    const output = input?.tool_response?.stdout || input?.tool_response?.output || input?.tool_output?.output || '';
    const match = output.match(PR_URL);
    if (!match) return;

    const [url, repo, number] = match;
    console.error(`[Hook] PR created: ${url}`);
    console.error(`[Hook] Review with: gh pr review ${number} --repo ${repo}`);
  })
  .catch(() => {})
  .finally(() => process.exit(0));
