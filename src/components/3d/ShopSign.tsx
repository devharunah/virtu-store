"use client";

import { HALF_D, SHOP } from "@/data/store-layout";
import { cldUrl } from "@/lib/image-url";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * The seller's signs, covering two boards baked into the shell (blender/shop.py):
 * - `main-signboard` above the shop front, 6.2 m wide, seen from the corridor;
 * - `sign-credit` on the back wall above the shelves, 3.4 m wide, seen once you're inside;
 * plus a board on the front of the back counter, straight ahead as you arrive.
 * Each shows the shop name in white on the theme's accent colour, drawn on a canvas with the
 * browser's own font, so there is no font file to download or license. When the seller uploaded
 * a banner, the front signboard shows it instead (cover-fitted), once it has loaded.
 */
interface Board {
  /** The front signboard is the one a banner replaces. */
  front?: boolean;
  width: number;
  height: number;
  position: [number, number, number];
  /** Canvas pixels: 2048 wide, same aspect as the board. */
  px: [number, number];
}

const FRONT_H = (6.2 * 380) / 2048;
const BACK_W = 3.4;
const BACK_H = (BACK_W * 130) / 1020;
const backCounter = SHOP.counters.find((c) => c.id === "counter-back");
const COUNTER_W = 4;
const COUNTER_H = 0.36;

const BOARDS: Board[] = [
  {
    front: true,
    width: 6.2,
    height: FRONT_H,
    position: [0, SHOP.front.openingTop + 0.3 + FRONT_H / 2, HALF_D + 0.075],
    px: [2048, 380],
  },
  {
    width: BACK_W,
    height: BACK_H,
    position: [0, 2.62 + BACK_H / 2, -HALF_D + 0.03],
    px: [2048, Math.round((2048 * 130) / 1020)],
  },
  // The white front of the back counter: what a visitor sees straight ahead from the corridor.
  ...(backCounter
    ? [
        {
          width: COUNTER_W,
          height: COUNTER_H,
          position: [
            backCounter.x,
            0.14 + COUNTER_H / 2,
            backCounter.z + backCounter.depth / 2 + 0.012,
          ],
          px: [2048, Math.round((2048 * COUNTER_H) / COUNTER_W)],
        } satisfies Board,
      ]
    : []),
];

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

function drawSign(
  ctx: CanvasRenderingContext2D,
  [w, h]: [number, number],
  name: string,
  accent: string,
) {
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, h - h * 0.07, w, h * 0.07);

  const text = name.toUpperCase();
  let size = Math.floor(h * 0.56);
  ctx.font = `900 ${size}px ${FONT}`;
  const max = w - h * 0.6;
  const width = ctx.measureText(text).width;
  if (width > max) {
    size = Math.floor((size * max) / width);
    ctx.font = `900 ${size}px ${FONT}`;
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 - h * 0.02);
}

/** Draws `image` to fill the canvas, cropping the overflow evenly (CSS `object-fit: cover`). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  [w, h]: [number, number],
  image: HTMLImageElement,
) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function SignBoard({
  board,
  name,
  accent,
  banner,
}: {
  board: Board;
  name: string;
  accent: string;
  banner: string | undefined;
}) {
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    [c.width, c.height] = board.px;
    const ctx = c.getContext("2d");
    if (ctx) drawSign(ctx, board.px, name, accent);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { canvas: c, texture: t };
  }, [board, name, accent]);

  useEffect(() => () => texture.dispose(), [texture]);

  // Paint the banner over the name once it loads; on error the name stays.
  useEffect(() => {
    if (!board.front || banner === undefined) return;
    let live = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!live || ctx === null) return;
      drawCover(ctx, board.px, image);
      texture.needsUpdate = true;
    };
    image.src = cldUrl(banner, `w_${board.px[0]},h_${board.px[1]},c_fill,g_auto,f_auto,q_auto`);
    return () => {
      live = false;
      image.onload = null;
    };
  }, [banner, board, canvas, texture]);

  return (
    <mesh position={board.position} raycast={() => null}>
      <planeGeometry args={[board.width, board.height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export function ShopSign({
  name,
  accent,
  banner,
}: {
  name: string;
  accent: string;
  banner?: string | undefined;
}) {
  return (
    <>
      {BOARDS.map((b) => (
        <SignBoard
          key={b.position.join(",")}
          board={b}
          name={name}
          accent={accent}
          banner={banner}
        />
      ))}
    </>
  );
}
