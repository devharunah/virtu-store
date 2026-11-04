# VIRTU.STORE — 3D Phone Showroom

An immersive 3D shop where visitors walk a character through a virtual phone store, inspect phones in 360°, choose storage and colour, and check out (simulated). It is built with Next.js, React Three Fiber, Rapier and Blender.

## Start here
| Doc | What it covers |
|---|---|
| [docs/architecture.html](docs/architecture.html) | **Open in a browser.** How the product works and how Three.js, physics, state and assets fit together |
| [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) | Phase-by-phase tasks, catalogue, types, folder structure |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Uganda market + network research, verified package versions, risks |
| [docs/ASSET-PIPELINE.md](docs/ASSET-PIPELINE.md) | Blender MCP setup, procedural phone recipe, optimisation |
| [docs/ASSETS-CREDITS.md](docs/ASSETS-CREDITS.md) | Licence log for every asset |

## Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000 (landing) and http://localhost:3000/store (3D preview).

> Next.js 16 note: see `AGENTS.md`. This Next version differs from older tutorials, and its docs ship in `node_modules/next/dist/docs/`. `ssr: false` must be used inside a Client Component (see `src/components/3d/ExperienceLoader.tsx`).

## What exists already
- `blender/phones.py`: generates 5 brand-neutral phones + a podium + a display table
- `public/models/`: optimised GLBs (~20 KB per phone) + `manifest.json`
- `docs/img/`: preview renders

Regenerate the models:
```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/phones.py
```

- `src/`: Next.js 16 app. It has `types/product.ts`, `data/products.ts` (5 phones, UGX prices), `PhoneModel` (loads a GLB and recolours its `Body` material), and a `/store` smoke-test scene

- `/store`: the furnished showroom (Phase 1) with a free camera. Add `?debug` to the URL to see the physics colliders.

Status: **Phases 0 and 1 done** (GitHub and Vercel still to connect). Next: **Phase 2, character and mobile controls**, in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md).
