// src/components/CharacterController.jsx
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  euler,
  quat,
  vec3,
} from "@react-three/rapier";
import { RPC, myPlayer } from "playroomkit";
import { useRef, useState, useEffect } from "react";
import { Vector3 } from "three";
import { Controls } from "../App";
import { useAudioManager } from "../hooks/useAudioManager";
import { useGameState } from "../hooks/useGameState";
import { Character } from "./Character";
import { FLOORS, FLOOR_HEIGHT, HEX_X_SPACING } from "./GameArena";

const MOVEMENT_SPEED = 4.2;
const JUMP_FORCE = 8;
const ROTATION_SPEED = 2.5;

export const CharacterController = ({
  player = false,
  firstNonDeadPlayer = false,
  controls,
  state,
  ...props
}) => {
  const { playAudio } = useAudioManager();
  const {
    stage,
    setInteractionMessage,
    treasureWorldPos,
    respawn,
    setRespawn,
    requiredTiles,
  } = useGameState();
  const [animation, setAnimation] = useState("idle");
  const [, get] = useKeyboardControls();
  const rb = useRef();
  const inTheAir = useRef(true);
  const cameraPosition = useRef();
  const cameraLookAt = useRef();
  const prevJumpPressed = useRef(false);
  const isBoostToggled = useRef(false);
  const prevBoostPressed = useRef(false);
  const me = myPlayer();
  const safeStartingPos = state?.getState("startingPos") || { x: 0, y: 3, z: 0 };

  const doRespawn = () => {
    if (rb.current) {
      const startingPos = state?.getState("startingPos") || safeStartingPos;
      rb.current.setTranslation(startingPos, true);
      rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (state.getState("dead")) {
        state.setState("dead", false);
      }
    }
    if (respawn) {
      setRespawn(false);
    }
  };

  useEffect(() => {
    if (stage === "countdown" || stage === "lobby") {
      state.setState("dead", false);
    }
  }, [stage]);

  // ✅ FIX: This hook is restructured to correctly sync remote players.
  useFrame(({ camera }) => {
    if (!rb.current) return;

    const isPlayerDead = state.getState("dead");

    // --- Part 1: Handle REMOTE player updates ---
    // This logic runs for every other player on your screen to make them move.
    if (!player) {
      if (isPlayerDead) return; // Don't move dead players
      const pos = state.getState("pos");
      if (pos) rb.current.setTranslation(pos, true);
      const rot = state.getState("rot");
      if (rot) rb.current.setRotation(rot, true);
      const anim = state.getState("animation");
      if (anim) setAnimation(anim);
      return; // Stop here for remote players.
    }

    // --- Part 2: Handle the LOCAL player ---
    // Everything below only runs for YOUR character.
    if (get()[Controls.respawn] || respawn) {
      doRespawn();
    }

    if (rb.current.translation().y < -FLOOR_HEIGHT * FLOORS.length - 10) {
      if (!isPlayerDead) {
        state.setState("dead", true);
        playAudio("Dead", true);
      }
      return;
    }

    if (isPlayerDead) {
      return;
    }

    // Camera follow logic
    if (player || firstNonDeadPlayer) {
        const rbPosition = vec3(rb.current.translation());
        if (!cameraLookAt.current) {
            cameraLookAt.current = new Vector3().copy(rbPosition);
        }
        cameraLookAt.current.lerp(rbPosition, 0.1);
        camera.lookAt(cameraLookAt.current);

        if (cameraPosition.current) {
            const worldPos = new Vector3();
            cameraPosition.current.getWorldPosition(worldPos);
            camera.position.lerp(worldPos, 0.1);
        }
    }

    // Only allow local player movement if the game stage is "game"
    if (stage !== "game") {
      return;
    }

    const curVel = rb.current.linvel();
    const impulse = { x: 0, y: 0, z: 0 };
    const rotVel = { x: 0, y: 0, z: 0 };

    const joystickBoost = controls.isPressed("Boost");
    if (joystickBoost && !prevBoostPressed.current) {
      isBoostToggled.current = !isBoostToggled.current;
    }
    prevBoostPressed.current = joystickBoost;
    const isBoosting = get()[Controls.boost] || isBoostToggled.current;
    const currentMovementSpeed = isBoosting ? MOVEMENT_SPEED * 2 : MOVEMENT_SPEED;
    const angle = controls.angle();
    const joystickX = Math.sin(angle);
    const joystickY = Math.cos(angle);

    if (get()[Controls.forward] || (controls.isJoystickPressed() && joystickY < -0.1)) {
      impulse.z += currentMovementSpeed;
    }
    if (get()[Controls.back] || (controls.isJoystickPressed() && joystickY > 0.1)) {
      impulse.z -= currentMovementSpeed;
    }
    if (get()[Controls.left] || (controls.isJoystickPressed() && joystickX < -0.1)) {
      rotVel.y += ROTATION_SPEED;
    }
    if (get()[Controls.right] || (controls.isJoystickPressed() && joystickX > 0.1)) {
      rotVel.y -= ROTATION_SPEED;
    }

    rb.current.setAngvel(rotVel);
    const eulerRot = euler().setFromQuaternion(quat(rb.current.rotation()));
    const rotatedImpulse = vec3(impulse).applyEuler(eulerRot);
    rb.current.setLinvel({ x: rotatedImpulse.x, y: curVel.y, z: rotatedImpulse.z });

    // Sync your state for other players to see
    state.setState("pos", rb.current.translation());
    state.setState("rot", rb.current.rotation());

    const joystickJump = controls.isPressed("Jump");
    const jumpJustPressed = (joystickJump && !prevJumpPressed.current) || get()[Controls.jump];
    prevJumpPressed.current = joystickJump;

    if (jumpJustPressed && !inTheAir.current) {
      rb.current.setLinvel({ ...rb.current.linvel(), y: JUMP_FORCE });
      inTheAir.current = true;
    }

    if (Math.abs(curVel.y) > 1) {
      inTheAir.current = true;
    }

    const movement = Math.abs(curVel.x) + Math.abs(curVel.z);
    let newAnimation = "idle";
    if (inTheAir.current && curVel.y > 2) {
      newAnimation = "jump_up";
    } else if (inTheAir.current && curVel.y < -5) {
      newAnimation = "fall";
    } else if (movement > 1) {
      newAnimation = "run";
    }
    setAnimation(newAnimation);
    state.setState("animation", newAnimation);

    // Win condition check
    if (treasureWorldPos) {
      const playerPos = vec3(rb.current.translation());
      const distance = playerPos.distanceTo(treasureWorldPos);
      const tilesHit = me?.getState("specialTilesHit") || 0;

      if (distance < HEX_X_SPACING * 1.5) {
        if (tilesHit >= requiredTiles) {
          setInteractionMessage("Press [Space] or [Jump] to WIN!");
          if (jumpJustPressed) {
            RPC.call("playerWon", me.state.profile, RPC.Mode.ALL);
          }
        } else {
          setInteractionMessage(`Find all the special tiles! (${tilesHit}/${requiredTiles})`);
        }
      } else {
        setInteractionMessage("");
      }
    }
  });

  const startingPos = state?.getState("startingPos") || safeStartingPos;

  if (state.getState("dead")) {
    return null;
  }

  return (
    <RigidBody
      {...props}
      position={[startingPos.x, startingPos.y, startingPos.z]}
      colliders={false}
      canSleep={false}
      enabledRotations={[false, true, false]}
      ref={rb}
      onCollisionEnter={(e) => {
        if (e.other.rigidBodyObject?.name === "hexagon") {
          inTheAir.current = false;
        }
      }}
      gravityScale={stage === "game" ? 2.5 : 0}
      name={player ? "player" : "other"}
    >
      <group ref={cameraPosition} position={[0, 8, -16]} />
      <Character
        scale={0.42}
        color={state.state.profile.color}
        name={state.state.profile.name}
        position-y={0.2}
        animation={animation}
      />
      <CapsuleCollider args={[0.1, 0.38]} position={[0, 0.68, 0]} />
    </RigidBody>
  );
};