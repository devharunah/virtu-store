# The Claude Code harness

Everything in this directory configures Claude Code for this project. It is committed, so every
person and every session gets the same subagents, commands, skills and hooks.

Most of it is vendored from [everything-claude-code](https://github.com/devharunah/everything-claude-code),
itself a fork of `affaan-m/everything-claude-code`, MIT licensed. It was copied rather than
installed as a plugin for two reasons: that repo's plugin manifest declares only `commands` and
`skills`, so a plugin install leaves the hooks behind, and several of the hooks need rewriting
before they run against this stack at all.

## What is here

| Directory | What it is |
|---|---|
| `agents/` | Subagents to delegate to: `planner`, `architect`, `code-reviewer`, `security-reviewer`, `tdd-guide`, `e2e-runner`, `build-error-resolver`, `refactor-cleaner`, `doc-updater` |
| `commands/` | Slash commands: `/plan`, `/tdd`, `/code-review`, `/e2e`, `/build-fix`, `/refactor-clean`, `/verify`, `/checkpoint`, `/learn`, `/orchestrate`, and more |
| `skills/` | Workflow and domain skills |
| `rules/` | Standing guidelines. Advisory. See precedence below |
| `contexts/` | Prompt modes: `dev`, `review`, `research` |
| `scripts/` | The Node implementations behind the hooks |
| `settings.json` | The hook wiring |
| `launch.json` | The dev server the Browser pane starts |
| `package-manager.json` | Pins the harness to pnpm |

## Precedence

`CLAUDE.md` and `AGENTS.md` win. Always.

`rules/` comes from a general-purpose collection and does not know this project. Two of them will
contradict the root `CLAUDE.md` as soon as you fill it in:

- `rules/testing.md` asks for 80% coverage everywhere. This template splits Jest and Playwright
  by what a test touches, not by a number.
- `rules/coding-style.md` assumes Prettier. This project formats with Biome.

The rest, security, agents, performance and patterns, are good and stack-agnostic, which is why
the directory is kept.

## What was changed from upstream

| Upstream hook | Status | Why |
|---|---|---|
| Block `pnpm dev` outside tmux | Dropped | No tmux on Windows, and it blocked the dev server outright |
| tmux reminder on long commands | Dropped | Same |
| Block writing any new `.md` | Dropped | It blocks docs the project wants, including this file |
| `tsc --noEmit` after every edit | Dropped | Ten to twenty seconds per individual edit. `pnpm typecheck` covers it at the gate |
| Prettier on edit | Rewritten | Now `scripts/hooks/biome-format.js`. Prettier would reformat every file into a shape `pnpm check` then rejects |

Three inline `node -e` one-liners became real files: `biome-format.js`, `check-console-log.js`
and `log-pr-url.js`. A hook nobody can read is a hook nobody can fix.

## Sessions

`SessionStart`, `SessionEnd` and `PreCompact` persist context to `~/.claude/sessions`, outside the
repo, so nothing session-shaped lands in git.

## Keeping it current

```bash
git clone --depth 1 https://github.com/devharunah/everything-claude-code /tmp/ecc
```

then diff the directories you care about. Nothing here is hand-edited except `settings.json` and
the three hook scripts named above, so upstream changes stay a straight copy.
