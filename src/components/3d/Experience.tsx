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
import { Environment, KeyboardControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { FloorPicker } from "./FloorPicker";
import { BASE_FOV, FollowCamera } from "./FollowCamera";
import { Interaction } from "./Interaction";
import { Player } from "./Player";
import { StoreScene } from "./StoreScene";
import { KEYBOARD_MAP } from "./controls";
import { moveTarget } from "./move-target";
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
            if (!debug) return;
            // __virtuProject: a world point → CSS pixels in the canvas (e2e clicks the floor with it).
            const project = (x: number, y: number, z: number) => {
              const v = new THREE.Vector3(x, y, z).project(state.camera);
              const r = state.gl.domElement.getBoundingClientRect();
              return {
                x: r.left + ((v.x + 1) / 2) * r.width,
                y: r.top + ((1 - v.y) / 2) * r.height,
              };
            };
            Object.assign(window, {
              __virtu: state,
              __virtuProject: project,
              __virtuMove: moveTarget,
            });
          }}
        >
          <PerformanceMonitor
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(1.5)}
            flipflops={3}
          />
          <color attach="background" args={["#1d1e20"]} />

          {/* The shop's light is baked into its lightmap (Blender/Cycles). These lights only shade
              what moves or changes: phones, the visitor, the glass. Cool fluorescent tone. */}
          <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={0.8} />
          <hemisphereLight args={["#eef6ff", "#6f6a62", 0.2]} />
          <directionalLight
            position={[0, ROOM.height - 0.2, 1.5]}
            intensity={0.55}
            color="#f2f8ff"
          />

          <Suspense fallback={null}>
            <Physics debug={debug}>
              <StoreScene />
              <FloorPicker />
              <Player />
            </Physics>
            <Interaction />
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
