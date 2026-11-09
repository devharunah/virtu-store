"use client";

import { SPAWN } from "@/data/store-layout";
import {
  type FloorVec,
  type Progress,
  crossedTarget,
  isStuck,
  startProgress,
  steerToward,
  trackProgress,
} from "@/lib/steer";
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
import { clearMoveTarget, moveTarget } from "./move-target";
import { BODY_CENTRE_Y, CAPSULE, PLAYER_GROUP, playerState } from "./player-state";

/** Scratch vector for the camera direction (reused every frame, never shared). */
const camForward = new THREE.Vector3();

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
    <group ref={group} position-y={-BODY_CENTRE_Y} name={PLAYER_GROUP}>
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

/** Progress toward one particular click (`version` tells a new click from the old one). */
interface TargetProgress {
  version: number;
  state: Progress;
  /** Where the visitor was last frame, to catch a step that jumps over the target. */
  last: FloorVec;
}

/**
 * One frame of click-to-move: the joystick toward the target, or `stick: null` (and the target
 * cleared) once the visitor has arrived or is blocked by a counter.
 */
function autoSteer(
  target: FloorVec,
  camera: THREE.Camera,
  dt: number,
  prev: TargetProgress | null,
) {
  const pos = { x: playerState.position.x, z: playerState.position.z };
  const dist = Math.hypot(target.x - pos.x, target.z - pos.z);
  const same = prev !== null && prev.version === moveTarget.version;
  const state = same ? trackProgress(prev.state, dist, dt) : startProgress(dist);
  const progress: TargetProgress = { version: moveTarget.version, state, last: pos };

  camera.getWorldDirection(camForward);
  const crossed = same && crossedTarget(prev.last, pos, target);
  const stick = crossed ? null : steerToward(pos, target, { x: camForward.x, z: camForward.z });
  if (!stick || isStuck(state)) {
    clearMoveTarget(stick ? "stuck" : "arrived");
    return { stick: null, progress };
  }
  return { stick, progress };
}

/**
 * The visitor: an ecctrl floating-capsule character. ecctrl v2 does not read input itself,
 * so every frame we merge keyboard keys and the touch joystick and hand them over.
 * Movement is relative to the camera, which ecctrl reads from the default camera.
 */
export function Player() {
  const ecctrl = useRef<EcctrlHandle>(null);
  const [, getKeys] = useKeyboardControls<Control>();

  const progress = useRef<TargetProgress | null>(null);

  useFrame(({ camera }, dt) => {
    const e = ecctrl.current;
    if (!e) return;
    playerState.position.copy(e.currPos);
    if (!playerState.ready) {
      playerState.ready = true;
      useUiStore.getState().setSceneReady(true);
    }

    // Stand still while a panel or the bag is open (keys then belong to the UI).
    if (useUiStore.getState().inspectingId || useCart.getState().isOpen) {
      clearMoveTarget("ui");
      e.setMovement(STOP);
      return;
    }
    const k = getKeys();
    const stick = useJoystickStore.getState().joysticks["default"];
    const jumpButton = useButtonStore.getState().buttons["jump"] ?? false;
    const manual = k.forward || k.backward || k.leftward || k.rightward || !!stick?.active;
    let jx = stick?.active ? stick.x : 0;
    let jy = stick?.active ? stick.y : 0;

    // Click-to-move: any manual input takes over; otherwise steer toward the clicked point.
    if (manual) clearMoveTarget("manual");
    else if (moveTarget.point) {
      const step = autoSteer(moveTarget.point, camera, dt, progress.current);
      progress.current = step.progress;
      jx = step.stick?.x ?? 0;
      jy = step.stick?.y ?? 0;
    }

    e.setMovement({
      forward: k.forward,
      backward: k.backward,
      leftward: k.leftward,
      rightward: k.rightward,
      jump: k.jump || jumpButton,
      run: k.run || (manual && Math.hypot(jx, jy) > 0.92),
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
