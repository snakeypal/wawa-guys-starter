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
import { setState, RPC } from "playroomkit";
import { useRef, useState } from "react";
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
  const isDead = state.getState("dead");
  const [animation, setAnimation] = useState("idle");
  const { stage, setInteractionMessage, treasureWorldPos, respawn, setRespawn } = useGameState();
  const [, get] = useKeyboardControls();
  const rb = useRef();
  const inTheAir = useRef(true);
  const cameraPosition = useRef();
  const cameraLookAt = useRef();
  
  // =======================================================
  // FIX: Refs to manage button state correctly
  // =======================================================
  const prevJumpPressed = useRef(false);
  const isBoostToggled = useRef(false);
  const prevBoostPressed = useRef(false);

  useFrame(({ camera }) => {
    if (!rb.current) return;
    if (stage === "lobby") return;

    // =======================================================
    // FIX: CAMERA LOGIC RESTORED
    // =======================================================
    if ((player && !isDead) || firstNonDeadPlayer) {
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
    // =======================================================

    if (stage !== "game") return;
    if (!player) {
      // NON-PLAYER SYNC
      const pos = state.getState("pos");
      if (pos) rb.current.setTranslation(pos);
      const rot = state.getState("rot");
      if (rot) rb.current.setRotation(rot);
      const anim = state.getState("animation");
      setAnimation(anim);
      return;
    }

    // RESPAWN LOGIC
    if (get()[Controls.respawn] || respawn) {
      const startingPos = state.getState("startingPos");
      if (startingPos) {
        rb.current.setTranslation(startingPos, true);
        rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      if (respawn) setRespawn(false);
    }
    
        // MOVEMENT LOGIC
    const curVel = rb.current.linvel();
    const impulse = { x: 0, y: 0, z: 0 };
    const rotVel = { x: 0, y: 0, z: 0 };
    
    // =======================================================
    // FIX: BOOST BUTTON LOGIC (Toggle for on-screen, Hold for keyboard)
    // =======================================================
    const joystickBoost = controls.isPressed("Boost");
    // Toggle logic for the on-screen button
    if (joystickBoost && !prevBoostPressed.current) {
      isBoostToggled.current = !isBoostToggled.current;
    }
    prevBoostPressed.current = joystickBoost;
    const isBoosting = get()[Controls.boost] || isBoostToggled.current;
    const currentMovementSpeed = isBoosting ? MOVEMENT_SPEED * 2 : MOVEMENT_SPEED;
    // =======================================================

    const angle = controls.angle();
    const joystickX = Math.sin(angle);
    const joystickY = Math.cos(angle);

    if (get()[Controls.forward] || (controls.isJoystickPressed() && joystickY < -0.1)) impulse.z += currentMovementSpeed;
    if (get()[Controls.back] || (controls.isJoystickPressed() && joystickY > 0.1)) impulse.z -= currentMovementSpeed;
    if (get()[Controls.left] || (controls.isJoystickPressed() && joystickX < -0.1)) rotVel.y += ROTATION_SPEED;
    if (get()[Controls.right] || (controls.isJoystickPressed() && joystickX > 0.1)) rotVel.y -= ROTATION_SPEED;

    rb.current.setAngvel(rotVel);
    const eulerRot = euler().setFromQuaternion(quat(rb.current.rotation()));
    const rotatedImpulse = vec3(impulse).applyEuler(eulerRot);
    
    rb.current.setLinvel({ x: rotatedImpulse.x, y: curVel.y, z: rotatedImpulse.z });

    // =======================================================
    // FIX: JUMP BUTTON LOGIC (Reliable one-shot press)
    // =======================================================
    const joystickJump = controls.isPressed("Jump");
    const jumpJustPressed = (joystickJump && !prevJumpPressed.current);
    prevJumpPressed.current = joystickJump;

    if ((get()[Controls.jump] || jumpJustPressed) && !inTheAir.current) {
      rb.current.setLinvel({ ...rb.current.linvel(), y: JUMP_FORCE });
      inTheAir.current = true;
    }
    // =======================================================

    if (Math.abs(curVel.y) > 1) {
      inTheAir.current = true;
    }

    // FIX: ANIMATION LOGIC now reads current velocity
    const movement = Math.abs(curVel.x) + Math.abs(curVel.z);
    if (inTheAir.current && curVel.y > 2) setAnimation("jump_up");
    else if (inTheAir.current && curVel.y < -5) setAnimation("fall");
    else if (movement > 1) setAnimation("run");
    else setAnimation("idle");
    state.setState("animation", animation); // Sync animation

    
    // DEAD LOGIC
    if (rb.current.translation().y < -FLOOR_HEIGHT * FLOORS.length && !state.getState("dead")) {
      state.setState("dead", true);
      setState("lastDead", state.state.profile, true);
      playAudio("Dead", true);
    }

    // WIN CONDITION CHECK
    if (treasureWorldPos) {
      const playerPos = vec3(rb.current.translation());
      const distance = playerPos.distanceTo(treasureWorldPos);

      if (distance < HEX_X_SPACING * 1.5) {
        const tilesHit = state.getState("specialTilesHit") || 0;
        const requiredTiles = FLOORS.length - 1;
        if (tilesHit >= requiredTiles) {
          RPC.call("playerWon", state.state.profile, RPC.Mode.ALL);
        } else {
          setInteractionMessage(
            `Find missing tiles! Press Q or TOP to respawn. (${tilesHit}/${requiredTiles} found)`
          );
        }
      } else {
        setInteractionMessage("");
      }
    }

    state.setState("pos", rb.current.translation());
    state.setState("rot", rb.current.rotation());
  });

  const startingPos = state.getState("startingPos");
  if (isDead || !startingPos) return null;

 return (
    <RigidBody
      {...props}
      position-x={startingPos.x}
      position-y={startingPos.y}
      position-z={startingPos.z}
      colliders={false}
      canSleep={false}
      enabledRotations={[false, true, false]}
      ref={rb}
      onCollisionEnter={(e) => {
        if (e.other.rigidBodyObject.name === "hexagon") {
          inTheAir.current = false;
        }
      }}
      gravityScale={stage === "game" ? 2.5 : 0}
      name={player ? "player" : "other"}
    >
      <group ref={cameraPosition} position={[0, 8, -16]}></group>
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
    