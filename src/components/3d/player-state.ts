import * as THREE from "three";

/**
 * Where the player is, written every frame by <Player> and read by the camera and the
 * proximity check. A plain mutable singleton on purpose: per-frame data must not go
 * through React state.
 */
export const playerState = {
  ready: false,
  /** Centre of the character's capsule, world space. */
  position: new THREE.Vector3(),
};

/** Name of the group around the character model; floor clicks pass through it (FloorPicker). */
export const PLAYER_GROUP = "player-model";

/** Height of the capsule centre above the floor: floatHeight + capsuleRadius + capsuleHalfHeight. */
export const CAPSULE = { halfHeight: 0.55, radius: 0.3, floatHeight: 0.2 } as const;
export const BODY_CENTRE_Y = CAPSULE.floatHeight + CAPSULE.radius + CAPSULE.halfHeight;
