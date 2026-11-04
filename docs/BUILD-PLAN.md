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
Names and prices are placeholders. Prices are in UGX and get adjusted per storage tier.

| id | Name | Tier | Base price (UGX) | Storage options | Colours |
|---|---|---|---|---|---|
| `nova-a1` | Nova A1 | Budget | 349,000 | 64 GB / 128 GB (+60k) | Midnight `#2B3A55`, Sand `#D8C7A3`, Mint `#9ED9C3` |
| `nova-a5` | Nova A5 | Entry | 549,000 | 128 GB / 256 GB (+90k) | Forest `#3E7C59`, Graphite `#3A3A3C`, Sky `#8EC5E8` |
| `pulse-x` | Pulse X | Mid-range | 899,000 | 128 GB / 256 GB (+120k) | Lilac `#C9B8E8`, Pearl `#F1EFEA`, Ink `#22252B` |
| `pulse-x-pro` | Pulse X Pro | Upper mid | 1,499,000 | 256 GB / 512 GB (+250k) | Sunset `#D9822B`, Ocean `#2C6E8F`, Onyx `#1F1F1F` |
| `zenith-ultra` | Zenith Ultra | Flagship | 3,499,000 | 256 GB / 512 GB (+400k) / 1 TB (+900k) | Titanium Black `#1C1C1E`, Silver `#C7C9CC`, Desert `#BFA27A` |

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
- [x] `display_table.glb` ×3 (table 1: Nova, table 2: Pulse, table 3: "colour bar" with every phone in its second colourway) + `podium.glb` with a slowly spinning Zenith Ultra
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

## Phase 4: Cart and simulated checkout
- [ ] `cart-store.ts` (zustand + `persist` to localStorage): add, remove, update qty/variant, totals
- [ ] `CartDrawer`: line items, change storage/qty, remove, subtotal, delivery fee (flat UGX 10k inside Kampala), total
- [ ] `/checkout`: name, phone number, delivery area (Kampala divisions dropdown), payment method radio **MTN MoMo / Airtel Money / Cash on delivery**, all **mock**. "Pay" shows a fake "Approve on your phone" spinner and then a success screen with an order number and an estimated boda delivery time
- [ ] A clear banner: "Demo: no real payment is taken"

**Done when:** the full 8-step success journey works end to end on desktop and on a phone.

## Phase 5: Polish, performance, deploy, demo
- [ ] Check the budget from RESEARCH §2: run Lighthouse with mobile throttling, and test on a real mid-range Android over 4G
- [ ] Compress environment textures (`gltf-transform optimize --texture-compress webp`); load HDRI at 1K
- [ ] Preload the next phone models with `useGLTF.preload`
- [ ] Polish: entrance camera sweep, hover glow on phones, subtle ambient audio (with a mute toggle)
- [ ] Deploy to Vercel production; add OG image (`docs/img/lineup-back.png` is a good start)
- [ ] Record a 30–45 s screen capture for TikTok (vertical, mobile) and LinkedIn (16:9, desktop)
- [ ] Fill in `docs/ASSETS-CREDITS.md` for every asset actually shipped

**Done when:** the public URL loads within 5 s on 4G, and both demo videos are recorded.

---

## Later (v2+)
- Aisle 2: sneakers (Sketchfab, licence-checked) using `variantKind: "size"`
- Supabase: products, orders, delivery requests; admin to edit prices
- Real payments via a Ugandan aggregator (e.g. Flutterwave/Pesapal MoMo APIs), only after legal and business review
- Multiplayer presence (see other shoppers), AR "view in your room" via `<model-viewer>`
