@AGENTS.md

# CLAUDE.md

Adopted from [claude-nextjs-supabase-template](https://github.com/devharunah/claude-nextjs-supabase-template).
The template's standing contract is kept; the project parts are filled in below.

## Project context

**VIRTU.STORE** is a walk-in 3D phone showroom for Ugandan shoppers: walk a character through a
virtual Kampala shop, inspect real iPhones and Samsung Galaxys in 3D, choose storage and colour, and check out (simulated).
Built as a showcase for LinkedIn and TikTok. Plans and research live in `docs/`.

**Stack**

- Framework: Next.js 16, App Router (`cacheComponents`, Partial Prefetching, Turbopack)
- Language: TypeScript, strict
- UI: React 19, Tailwind CSS v4 (`@tailwindcss/turbopack`)
- 3D: three.js, React Three Fiber 9, drei 10, Rapier 2 physics, ecctrl 2 character controller
- State: zustand 5
- 3D assets: Blender 5.2 Python generators in `blender/`, optimised with `gltf-transform` (meshopt)
- Data: static TypeScript for now. No backend, no environment variables yet
- Package manager: pnpm, pinned in `packageManager`
- Hosting: Vercel (GitHub integration: preview per PR, production on `main`)

**Layout**

| Path | What lives there |
|---|---|
| `src/app/` | Routes: `/` landing, `/store` the 3D showroom, `/checkout` |
| `src/components/3d/` | Everything inside the R3F `<Canvas>`. Client-only |
| `src/components/ui/`, `cart/`, `products/` | HTML overlay UI |
| `src/data/` | Product catalogue and the store layout (fixtures, colliders, spawn) |
| `src/store/` | zustand stores |
| `src/lib/` | Pure modules (pricing, formatting) |
| `public/models/` | Optimised GLBs + `manifest.json`. Material names are an API (see `docs/ASSET-PIPELINE.md`) |
| `blender/` | Asset generators. Run headless; they clear the scene |
| `docs/` | Architecture explainer, build plan, research, asset pipeline, credits |
| `e2e/` | Playwright. Anything that renders or fetches belongs here |
| `**/__tests__/` | Jest. Pure modules only |
| `.claude/` | The Claude Code harness. See `.claude/README.md` |

## Project rules

- **No time estimates** in plans, docs or replies. Describe scope and "done when" criteria only.
- WebGL code is client-only. `ssr: false` must be used inside a Client Component
  (`ExperienceLoader.tsx`); Next 16 rejects it in Server Components.
- Every fixture, its collider and its phone slots are defined once, in `src/data/store-layout.ts`.
- Phone colourways recolour the GLB material named `Body`; the `Screen` material gets a runtime
  wallpaper (`screen-texture.ts`). Never rename GLB materials, and optimise phones with
  `--palette false --prune-attributes false` (see `docs/ASSET-PIPELINE.md`).
- Performance budget: first 3D download ≤ 5 MB, ≤ 150 draw calls, DPR ≤ 1.5. Use `/store?debug`
  to see colliders and read `window.__virtu.get().gl.info`.
- Asset licences: log every third-party asset in `docs/ASSETS-CREDITS.md` before it lands.
- The phones are real products (Apple, Samsung) with logos on the models. Keep `TrademarkNotice` on
  every page that sells them, and keep prices labelled as indicative.

## Environment

Never read `process.env` directly. Call `requireEnv` from `src/lib/env.ts` (add it with the first
variable), so a missing variable fails at the point of use with a message naming the variable and
pointing at `.env.example`. Add every new variable to `.env.example` in the same commit as the
code that reads it.

## TypeScript

`strict` is on, and so are the flags `strict` leaves out:

| Flag | What it costs you |
|---|---|
| `noUncheckedIndexedAccess` | `arr[0]` and `record[key]` come back `T \| undefined`. Narrow before use |
| `exactOptionalPropertyTypes` | `{ a?: string }` will not accept `{ a: undefined }`. Omit the key instead |
| `noPropertyAccessFromIndexSignature` | Index signatures need brackets: `process.env["CI"]`, `userData["x"]` |
| `verbatimModuleSyntax` | Type-only imports must say `import type` |
| `noUnusedLocals`, `noUnusedParameters` | An unused binding fails the build. Prefix with `_` if it has to stay |
| `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride` | Every branch returns, every case breaks, every override is declared |

Biome's `useLiteralKeys` is off because it fights `noPropertyAccessFromIndexSignature`.
`pnpm typecheck` runs `next typegen` first so route types exist on a clean clone.
`.next/dev` is excluded from `tsc`: `next dev` writes generated files there that trip the unused
checks.

## The test split

- **Jest** covers pure modules: pricing, cart logic, catalogue and layout integrity.
- **Playwright** covers anything that renders: pages, the 3D scene loading, the shopping flow.
  It boots a production build on port 3100. Headless Chromium renders WebGL with SwiftShader.

Name unit tests `*.test.ts`; `jest.config.cjs` ignores `e2e/`.

## Before you push

```bash
pnpm verify
```

Lint, typecheck, Jest and Playwright. Do not push if any step fails.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <short description>`.
Types: `feat`, `fix`, `style`, `refactor`, `test`, `chore`, `docs`, `perf`, `ci`, `revert`.
Imperative, lowercase, no trailing period, 72 characters at most.

## Branches

Never push to `main`. Everything goes through a PR, `main` stays deployable, and CI must be green
before merge. Branch names: `<type>/<short-description>`.

## What the harness adds

`.claude/` carries subagents, slash commands, skills, rules and hooks. Read `.claude/README.md`.
**This file wins** wherever a vendored rule disagrees with it.
