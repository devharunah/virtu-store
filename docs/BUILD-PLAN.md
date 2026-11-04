# VIRTU.STORE — Build Plan (Phone Store Edition)

> Read first: [architecture.html](architecture.html) (how it all fits) · Research: [RESEARCH.md](RESEARCH.md) · Assets: [ASSET-PIPELINE.md](ASSET-PIPELINE.md), [ASSETS-CREDITS.md](ASSETS-CREDITS.md)

## Goal
A polished, shareable prototype (LinkedIn/TikTok) where a visitor can:

1. open the site → 2. enter a 3D phone showroom → 3. walk around as a character → 4. approach a phone → 5. inspect it in 3D (rotate/zoom) → 6. choose **storage + colour** → 7. add to cart → 8. finish a **simulated** checkout (mock MoMo/Airtel Money + boda delivery request).

**Out of scope for v1** (same as the PDF): real payments, vendor dashboard, auth, inventory, Supabase.

## What already exists
| Path | What |
|---|---|
| `blender/phones.py` | Procedural generator for 5 phones + podium + display table. Re-run it any time |
| `public/models/phones/*.glb` | 5 optimised phones (meshopt, ~14–23 KB each) |
| `public/models/fixtures/*.glb` | `podium.glb`, `display_table.glb` |
| `public/models/manifest.json` | ids, dimensions, triangle counts, material names |
| `docs/img/lineup-*.png` | Blender preview renders |

## Product catalogue (v1)
Real phones, with brand logos on the 3D models and a trademark notice in the UI. Prices are **indicative** Kampala retail in UGX (Nov 2026): Galaxy S25 Ultra and A56 come from a Feb 2026 Uganda round-up; the iPhone 17 Pro Max has no reliable local price yet, so it is an estimate. Storage tiers add to the base price.

| id | Name | Tier | Base price (UGX) | Storage options | Colours |
|---|---|---|---|---|---|
| `galaxy-a17` | Samsung Galaxy A17 5G | Entry | 720,000 | 128 GB / 256 GB (+120k) | Black, Blue, Gray |
| `galaxy-a56` | Samsung Galaxy A56 5G | Mid-range | 1,390,000 | 128 GB / 256 GB (+180k) | Awesome Graphite, Lightgray, Olive, Pink |
| `iphone-17` | Apple iPhone 17 | Upper mid | 4,300,000 | 256 GB / 512 GB (+900k) | Black, White, Mist Blue, Sage, Lavender |
| `galaxy-s25-ultra` | Samsung Galaxy S25 Ultra | Flagship | 4,950,000 | 256 GB / 512 GB (+700k) / 1 TB (+1.6M) | Titanium Silverblue, Black, Gray, Whitesilver |
| `iphone-17-pro-max` | Apple iPhone 17 Pro Max (hero podium) | Flagship | 6,200,000 (est.) | 256 GB / 512 GB (+900k) / 1 TB (+1.9M) / 2 TB (+3.9M) | Cosmic Orange, Deep Blue, Silver |

### Data types (`src/types/product.ts`)
```ts
export type VariantKind = "storage" | "size";        // "size" reserved for sneakers (Aisle 2)

export interface ColourOption { id: string; label: string; hex: string; }
export interface VariantOption { id: string; label: string; priceDelta: number; }

export interface Product {
  id: string;                 // matches GLB filename
  name: string;
  tier: "Budget" | "Entry" | "Mid-range" | "Upper mid" | "Flagship";
  basePrice: number;          // UGX, integer
  modelUrl: string;           // /models/phones/<id>.glb
  colours: ColourOption[];    // applied to the GLB material named "Body"
  variantKind: VariantKind;
  variants: VariantOption[];
  specs: { screen: string; battery: string; camera: string; ram: string };
  displaySlot: string;        // which fixture/slot in the store it sits on
}

export interface CartItem {
  productId: string; colourId: string; variantId: string;
  qty: number; unitPrice: number;
}
```

## Target source tree
```
3D-Shope/
├── blender/                      # asset generators (Python, run in Blender)
├── docs/                         # these docs
├── public/
│   ├── models/{phones,fixtures,characters,environment}/
│   ├── textures/                 # Poly Haven floor/wall (WebP/KTX2)
│   ├── hdri/                     # 1K .hdr from Poly Haven
│   └── screens/                  # our own wallpaper art for the Screen material
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx              # landing / "Enter store"
    │   ├── store/page.tsx        # 3D experience (client-only)
    │   └── checkout/page.tsx     # simulated checkout
    ├── components/
    │   ├── 3d/
    │   │   ├── Experience.tsx    # <Canvas> + Physics + lights + PerformanceMonitor
    │   │   ├── StoreScene.tsx    # floor, walls, fixtures, colliders
    │   │   ├── Player.tsx        # ecctrl character + animations
    │   │   ├── PhoneDisplay.tsx  # one phone on a fixture + proximity sensor
    │   │   ├── PhoneModel.tsx    # useGLTF + colour swap + screen texture
    │   │   └── InspectViewer.tsx # second small Canvas, OrbitControls
    │   ├── ui/                   # HUD, InteractPrompt, Joystick, Loader
    │   ├── products/ProductPanel.tsx
    │   └── cart/{CartDrawer,CartItemRow}.tsx
    ├── store/                    # zustand: cart-store.ts, ui-store.ts
    ├── data/products.ts
    ├── lib/{format-ugx.ts, assets.ts}
    └── types/product.ts
```

---

## Phase 0: Project setup
- [ ] `npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --import-alias "@/*"`
- [ ] `npm i three @react-three/fiber @react-three/drei @react-three/rapier ecctrl leva zustand lucide-react`
- [ ] `npm i -D @types/three`
- [ ] `git init`, first commit, push to GitHub, connect to Vercel (preview deploys on every push)
- [ ] Keep `blender/`, `docs/`, and `public/models/` as they are now

**Done when:** `npm run dev` shows a page, and Vercel shows a preview URL.

## Phase 1: Environment ✅ (done 4 Nov 2026)
- [x] `Experience.tsx`: `<Canvas>` with DPR 1.5 → 1 via `PerformanceMonitor`, loaded through the client wrapper `ExperienceLoader.tsx` (`ssr: false`)
- [x] Lighting: `<Environment files="/hdri/brown_photostudio_02_1k.hdr">` + hemisphere + one directional light + `<ContactShadows frames={1}>` (rendered once after load, so it's free afterwards)
- [x] `Room.tsx`: 12 × 10 × 3.4 m room, Poly Haven marble floor, painted plaster walls (navy accent behind the sign), ceiling light panels, glass shop front with an open doorway and pavement outside
- [x] Props are original, built by `blender/store_props.py`: counter, 2 wall display bays, snake plants, 3D "VIRTU.STORE" sign. (Kenney/Poly Pizza were not needed.)
- [x] `display_table.glb` ×3 (table 1: Galaxy A17 + A56, table 2: iPhone 17 + Galaxy S25 Ultra, table 3: "colour bar" with every phone in its second colourway) + `podium.glb` with a slowly spinning iPhone 17 Pro Max
- [x] Retail boxes on the wall bays drawn as one instanced mesh (88 boxes, 1 draw call)
- [x] Static Rapier colliders for walls, glass, fixtures and plants, all defined once in `src/data/store-layout.ts`. The doorway is open, with a stop 1 m outside
- [x] Loading overlay (`components/ui/Loader.tsx`) driven by drei `useProgress`
- [x] `CameraRig.tsx`: free orbit/pan/zoom camera clamped inside the room; field of view widens on portrait phones
- [x] `?debug` URL flag: draws colliders and exposes renderer stats as `window.__virtu`

**Measured:** 82 draw calls, ~37k triangles. The production `/store` download is about 3 MB gzipped: Rapier ~815 KB, three.js ~300 KB, other JS ~150 KB, models 192 KB, textures 248 KB, HDRI ~1.26 MB.
**Not yet measured:** real frame rate. The test browser pane was hidden, which throttles it, so check FPS on a real desktop and on a mid-range Android.
**Possible saving later:** the HDRI is the largest asset. A 512 px version or a prefiltered cube map could cut about 1 MB.

## Phase 2: Character and controls, including mobile ✅
- [x] Quaternius "Animated Human" (CC0), converted by `blender/character.py`: 1.75 m, feet at the origin, facing +Z, palette recoloured (deeper skin tone, near-black hair, VIRTU-orange shirt), clips `idle` / `walk` / `run` / `jump`
- [x] `Player.tsx`: ecctrl v2 floating capsule. ecctrl v2 does **not** read input itself: every frame we merge drei `KeyboardControls` (WASD/arrows, Shift run, Space jump) with ecctrl's touch joystick and jump button and call `setMovement`. Animation states come from `EcctrlAnimationStateController`
- [x] `FollowCamera.tsx`: OrbitControls whose target follows the player (drag to look, scroll/pinch zoom), clamped inside the room; portrait screens get a wider field of view
- [x] Collisions with walls, glass, tables, counter and plants (Rapier colliders from `store-layout.ts`)
- [x] **Mobile:** ecctrl `Joystick` + `VirtualButton` (pinned on screen; ecctrl renders them `position: fixed` without offsets), plus an "Inspect <phone>" button when one is in reach. Shown only on `pointer: coarse`
- [x] Spawn just inside the door, facing the hero podium

## Phase 3: Phones and interaction ✅
- [x] `src/lib/display-slots.ts`: every phone on display resolved to world space; `nearestSlot()` picks the phone within 1.5 m. This replaced per-phone physics sensors, because several phones share one table
- [x] Prompt floating over the nearest phone ("from UGX … · E to inspect" / "Tap to inspect"); the phone grows slightly when in reach; click/tap any phone to open it
- [x] `ProductPanel` (native `<dialog>`): tier, name, live price in UGX, colour swatches, storage chips with price deltas, specs. Esc/close/backdrop close it, and the showroom canvas pauses while it is open
- [x] `InspectViewer`: a separate small canvas, auto-rotating, drag to spin 360°, scroll/pinch to zoom, colour changes live
- [x] `ui-store.ts`: near phone (and its displayed colour), inspected phone, the visitor's colour/storage choice per product
- [ ] Screen wallpaper texture on the `Screen` material (moved to Phase 5 polish)
- "Add to cart" lands with Phase 4

## Phase 4: Cart and simulated checkout ✅
Built in parallel by a subagent in its own git worktree, then wired into the store.
- [x] `src/lib/pricing.ts`: `unitPrice`, delivery fees (UGX 10,000 in Kampala, 25,000 outside), `cartTotals`
- [x] `src/store/cart-store.ts`: zustand + `persist` (`virtu-cart-v1`). Lines are keyed by product + colour + storage; prices are derived from the catalogue at read time, never trusted from storage; stored data is sanitised on load; hydration is safe for prerendering
- [x] `CartButton` + `CartDrawer` (native `<dialog>`, focus trap, Esc, body scroll lock): change storage or quantity, remove, subtotal. Mounted on `/store` and `/checkout`
- [x] "Add to bag · UGX …" in the inspect sheet, then "View bag and check out". The player stands still while the bag is open
- [x] `/checkout`: the "Demo store: no real payment is taken" banner, an order summary, name, Ugandan phone (normalised to +256, network detected), Kampala division or outside Kampala, landmark notes, **MTN MoMo / Airtel Money / Cash on delivery**. MoMo needs an MTN number and Airtel Money an Airtel number. A mock "approve the prompt on your phone" step leads to an order number (`VIRTU-XXXXXX`) and a boda ETA, and the bag is cleared

## Phase 5: Polish, performance, deploy ✅ (two items need a human)
- [x] Phone screens: an original lock-screen wallpaper drawn into a canvas at runtime in each phone's colour (`screen-texture.ts`), so no download
- [x] Open Graph and Twitter preview image (`src/app/opengraph-image.jpg`, 1200×630) for LinkedIn/WhatsApp/X links
- [x] Cache headers for 3D assets: 1 h in the browser, 1 day at the CDN, background revalidation
- [x] Preloading of every model the showroom uses (`useGLTF.preload`)
- [x] Hover/near feedback on phones (they grow slightly when in reach; pointer cursor on hover)
- [x] An end-to-end test of the full 8-step journey from the brief (`e2e/journey.spec.ts`)
- [x] CI on every PR (lint, typecheck + build, Jest, Playwright), Vercel preview per PR, production on `main`
- [ ] **Human:** test on a real mid-range Android over 4G (frame rate, joystick feel)
- [ ] **Human:** record the demo videos (TikTok vertical on a phone, LinkedIn 16:9 on desktop)
- Not done, as optional polish: entrance camera sweep, ambient audio with a mute toggle

**Measured (production build, 4 Nov 2026):**
| Budget | Target | Now |
|---|---|---|
| Draw calls in the store | ≤ 150 | 91 |
| Triangles in view | n/a | ~41k |
| JS, gzipped | n/a | ~1.34 MB (Rapier ~815 KB, three.js ~290 KB) |
| 3D assets | n/a | models 456 KB (character 234 KB), textures 248 KB, HDRI ~1.26 MB gzipped |
| First `/store` download | ≤ 5 MB | ~3.3 MB |

Real frame rate still has to be measured on a real device (the automated browser renders WebGL in software).
Biggest remaining saving: a 512 px HDRI or a prefiltered environment map (about 1 MB).

---

## Later (v2+)
- Aisle 2: sneakers (Sketchfab, licence-checked) using `variantKind: "size"`
- Supabase: products, orders, delivery requests; admin to edit prices
- Real payments via a Ugandan aggregator (e.g. Flutterwave/Pesapal MoMo APIs), only after legal and business review
- Multiplayer presence (see other shoppers), AR "view in your room" via `<model-viewer>`
