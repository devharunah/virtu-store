"use client";

/**
 * Phase 1: the lit, furnished showroom with static physics colliders and a free camera.
 * Phase 2 adds the ecctrl player inside <Physics>. See docs/BUILD-PLAN.md.
 * Add ?debug to the URL to draw the physics colliders.
 */
import { ContactShadows, Environment, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { ROOM } from "@/data/store-layout";
import { BASE_FOV, CameraRig } from "./CameraRig";
import { StoreScene } from "./StoreScene";

const debug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");

export default function Experience() {
  const [dpr, setDpr] = useState(1.5);

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={dpr}
        camera={{ fov: BASE_FOV, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={(state) => {
          // ?debug: expose renderer stats (draw calls, triangles) for performance checks
          if (debug) Object.assign(window, { __virtu: state });
        }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} />
        <color attach="background" args={["#dfe6ea"]} />
        <fog attach="fog" args={["#dfe6ea", 14, 40]} />

        {/* Image-based light from a 1K Poly Haven studio HDRI (lighting only, not shown as background) */}
        <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={0.95} />
        <hemisphereLight args={["#fff6e6", "#8a7f70", 0.65]} />
        <directionalLight position={[3, ROOM.height + 2, 4]} intensity={1.1} color="#fff1dc" />

        <Suspense fallback={null}>
          <Physics debug={debug}>
            <StoreScene />
          </Physics>
          {/* Rendered once after everything has loaded: soft shadows under fixtures for free */}
          <ContactShadows position={[0, 0.003, 0]} scale={[ROOM.width, ROOM.depth]} resolution={1024} far={2.5} blur={2.2} opacity={0.55} frames={1} />
        </Suspense>

        <CameraRig />
      </Canvas>
      <Loader />
    </div>
  );
}
