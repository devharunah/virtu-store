"use client";

import { PhoneModel } from "@/components/3d/PhoneModel";
import { Center, ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

/**
 * A small, separate canvas for inspecting one phone: drag to spin 360°, scroll or pinch to zoom.
 * It slowly auto-rotates until the visitor takes over.
 */
export default function InspectViewer({
  url,
  colour,
}: { url: string; colour: string | undefined }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.03, 0.42], fov: 35, near: 0.01, far: 10 }}>
      <color attach="background" args={["#efece6"]} />
      <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={1.15} />
      <directionalLight position={[0.6, 1, 0.8]} intensity={1.2} />
      <Suspense fallback={null}>
        <Center>
          <PhoneModel url={url} colour={colour} />
        </Center>
        <ContactShadows position={[0, -0.085, 0]} scale={0.5} blur={2.5} opacity={0.45} far={0.3} />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.6}
        minDistance={0.2}
        maxDistance={0.75}
      />
    </Canvas>
  );
}
