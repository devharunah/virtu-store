"use client";

/**
 * Phase 0 smoke test: proves Next.js + R3F + drei + meshopt GLBs + runtime
 * recolouring work together. Phase 1 replaces this with the real showroom
 * (StoreScene, Physics, Player). See docs/BUILD-PLAN.md.
 */
import { ContactShadows, Environment, Lightformer, OrbitControls, PerformanceMonitor, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { products } from "@/data/products";
import { PhoneModel } from "./PhoneModel";

const TABLE_TOP = 0.9; // metres; matches display_table.glb
const PODIUM_TOP = 0.92;

function Fixture({ url, ...props }: { url: string; position?: [number, number, number] }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone(true)} {...props} />;
}

function Showcase() {
  const onTable = products.filter((p) => p.displaySlot !== "podium");
  const hero = products.find((p) => p.displaySlot === "podium");
  return (
    <>
      <Fixture url="/models/fixtures/display_table.glb" position={[-0.4, 0, 0]} />
      <Fixture url="/models/fixtures/podium.glb" position={[0.85, 0, 0]} />
      {onTable.map((p, i) => (
        <PhoneModel
          key={p.id}
          url={p.modelUrl}
          colour={p.colours[0].hex}
          position={[-0.4 + (i - (onTable.length - 1) / 2) * 0.32, TABLE_TOP, 0]}
          rotation={[0, i % 2 ? Math.PI * 0.85 : 0.25, 0]}
          scale={1.6}
        />
      ))}
      {hero && (
        <PhoneModel
          url={hero.modelUrl}
          colour={hero.colours[1].hex}
          position={[0.85, PODIUM_TOP, 0]}
          rotation={[0, Math.PI * 0.8, 0]}
          scale={2.2}
        />
      )}
    </>
  );
}

export default function Experience() {
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas dpr={dpr} camera={{ position: [0.2, 1.35, 2.4], fov: 40 }}>
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <color attach="background" args={["#efece6"]} />
      {/* Local light-formers instead of an HDRI file: no extra download. */}
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer intensity={1} position={[-4, 2, 0]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer intensity={1} position={[4, 2, 0]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
      </Environment>
      <directionalLight position={[2, 4, 3]} intensity={1.2} />
      <Suspense fallback={null}>
        <Showcase />
      </Suspense>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.4} scale={6} blur={2.4} far={2} />
      <OrbitControls target={[0.1, 0.95, 0]} minDistance={0.6} maxDistance={5} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}

products.forEach((p) => useGLTF.preload(p.modelUrl));
