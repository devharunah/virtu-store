"use client";

import { SPAWN } from "@/data/store-layout";
import { useCart } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import {
  type EcctrlAnimationState,
  EcctrlAnimationStateController,
  useEcctrlAnimationStore,
} from "ecctrl/animation";
import { useButtonStore, useJoystickStore } from "ecctrl/input";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Control } from "./controls";
import { BODY_CENTRE_Y, CAPSULE, playerState } from "./player-state";

export const PLAYER_URL = "/models/characters/player.glb";

/** ecctrl's animation states mapped onto the four clips in player.glb. */
const CLIP_FOR: Record<EcctrlAnimationState, "idle" | "walk" | "run" | "jump"> = {
  IDLE: "idle",
  WALK: "walk",
  RUN: "run",
  JUMP_START: "jump",
  JUMP_IDLE: "jump",
  JUMP_FALL: "jump",
  JUMP_LAND: "idle",
};

/** three.js actions are mutable objects by design; configure the jump clip to play once and hold. */
function playOnceAndHold(action: THREE.AnimationAction) {
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
}

function CharacterModel() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(PLAYER_URL);
  const { actions } = useAnimations(animations, group);
  const state = useEcctrlAnimationStore((s) => s.animationState);
  const clip = CLIP_FOR[state];

  useEffect(() => {
    const action = actions[clip];
    if (!action) return undefined;
    if (clip === "jump") playOnceAndHold(action);
    action.reset().fadeIn(0.18).play();
    return () => {
      action.fadeOut(0.18);
    };
  }, [actions, clip]);

  return (
    <group ref={group} position-y={-BODY_CENTRE_Y}>
      <primitive object={scene} />
    </group>
  );
}

const STOP = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  run: false,
  jump: false,
  joystick: { x: 0, y: 0 },
};

/**
 * The visitor: an ecctrl floating-capsule character. ecctrl v2 does not read input itself,
 * so every frame we merge keyboard keys and the touch joystick and hand them over.
 * Movement is relative to the camera, which ecctrl reads from the default camera.
 */
export function Player() {
  const ecctrl = useRef<EcctrlHandle>(null);
  const [, getKeys] = useKeyboardControls<Control>();

  useFrame(() => {
    const e = ecctrl.current;
    if (!e) return;
    playerState.position.copy(e.currPos);
    if (!playerState.ready) {
      playerState.ready = true;
      useUiStore.getState().setSceneReady(true);
    }

    // Stand still while a panel or the bag is open (keys then belong to the UI).
    if (useUiStore.getState().inspectingId || useCart.getState().isOpen) {
      e.setMovement(STOP);
      return;
    }
    const k = getKeys();
    const stick = useJoystickStore.getState().joysticks["default"];
    const jumpButton = useButtonStore.getState().buttons["jump"] ?? false;
    const jx = stick?.active ? stick.x : 0;
    const jy = stick?.active ? stick.y : 0;
    e.setMovement({
      forward: k.forward,
      backward: k.backward,
      leftward: k.leftward,
      rightward: k.rightward,
      jump: k.jump || jumpButton,
      run: k.run || Math.hypot(jx, jy) > 0.92,
      joystick: { x: jx, y: jy },
    });
  });

  useEffect(
    () => () => {
      playerState.ready = false;
      useUiStore.getState().setSceneReady(false);
    },
    [],
  );

  return (
    <>
      <EcctrlAnimationStateController ecctrl={ecctrl} />
      <Ecctrl
        ref={ecctrl}
        position={[SPAWN.position[0], BODY_CENTRE_Y + 0.05, SPAWN.position[2]]}
        rotation={[0, Math.PI, 0]} // the model faces +Z; start facing into the store (-Z)
        capsuleHalfHeight={CAPSULE.halfHeight}
        capsuleRadius={CAPSULE.radius}
        floatHeight={CAPSULE.floatHeight}
        maxWalkVel={2.2}
        maxRunVel={4.6}
        jumpVel={4}
        followPlatform={false}
        applyCounterMass={false}
        applyCounterMoveImp={false}
        applyCounterJumpImp={false}
      >
        <CharacterModel />
      </Ecctrl>
    </>
  );
}

useGLTF.preload(PLAYER_URL);
