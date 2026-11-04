"use client";

/**
 * The showroom: lit, furnished room with physics, a walking player, a follow camera,
 * proximity prompts and the inspection panel. Add ?debug to the URL to draw colliders and
 * expose `window.__virtu` (renderer), `window.__virtuUI` (UI store), `window.__virtuPlayer`.
 */
import { ProductPanel } from "@/components/products/ProductPanel";
import { Loader } from "@/components/ui/Loader";
import { TouchControls } from "@/components/ui/TouchControls";
import { ROOM } from "@/data/store-layout";
import { useCart } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import {
  ContactShadows,
  Environment,
  KeyboardControls,
  PerformanceMonitor,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useState } from "react";
import { BASE_FOV, FollowCamera } from "./FollowCamera";
import { Interaction } from "./Interaction";
import { Player } from "./Player";
import { StoreScene } from "./StoreScene";
import { KEYBOARD_MAP } from "./controls";
import { playerState } from "./player-state";

const debug =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");

/** E opens the phone you're next to; Escape closes the panel. Ignored while typing in a field. */
function useInteractionKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const ui = useUiStore.getState();
      if (useCart.getState().isOpen) return; // the bag handles its own keys
      if (e.key === "Escape" && ui.inspectingId) ui.closeInspect();
      if ((e.key === "e" || e.key === "E") && !ui.inspectingId && ui.nearProductId) {
        ui.openInspect(ui.nearProductId, ui.nearColourId ?? undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function Experience() {
  const [dpr, setDpr] = useState(1.5);
  const inspecting = useUiStore((s) => s.inspectingId !== null);
  useInteractionKeys();

  useEffect(() => {
    if (debug) Object.assign(window, { __virtuUI: useUiStore, __virtuPlayer: playerState });
  }, []);

  return (
    <div className="absolute inset-0">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas
          // Pause the showroom while the inspection viewer has its own canvas open (saves the GPU on phones).
          frameloop={inspecting ? "never" : "always"}
          dpr={dpr}
          camera={{ fov: BASE_FOV, near: 0.05, far: 60 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={(state) => {
            if (debug) Object.assign(window, { __virtu: state });
          }}
        >
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.5)}
            flipflops={3}
          />
          <color attach="background" args={["#dfe6ea"]} />
          <fog attach="fog" args={["#dfe6ea", 14, 40]} />

          {/* Image-based light from a 1K Poly Haven studio HDRI (lighting only, not shown as background) */}
          <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={0.95} />
          <hemisphereLight args={["#fff6e6", "#8a7f70", 0.65]} />
          <directionalLight position={[3, ROOM.height + 2, 4]} intensity={1.1} color="#fff1dc" />

          <Suspense fallback={null}>
            <Physics debug={debug}>
              <StoreScene />
              <Player />
            </Physics>
            <Interaction />
            {/* Rendered once after everything has loaded: soft shadows under fixtures for free */}
            <ContactShadows
              position={[0, 0.003, 0]}
              scale={[ROOM.width, ROOM.depth]}
              resolution={1024}
              far={2.5}
              blur={2.2}
              opacity={0.55}
              frames={1}
            />
          </Suspense>

          <FollowCamera />
        </Canvas>
      </KeyboardControls>
      <TouchControls />
      <ProductPanel />
      <Loader />
    </div>
  );
}
