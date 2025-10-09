// src/components/Hexagon.jsx
import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { myPlayer } from "playroomkit";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Color } from "three";
import { randFloat, randInt } from "three/src/math/MathUtils.js";
import { useAudioManager } from "../hooks/useAudioManager";

const TIME_BEFORE_FALL = 200; // ms

export function Hexagon({ color, onHit, hit, isSpecial, ...props }) {
  const { playAudio } = useAudioManager();
  const { nodes, materials } = useGLTF("/models/hexagon.glb", "draco/gltf/");
  const [isHit, setIsHit] = useState(false); // This state now controls the color change for ALL tiles
  const [isGone, setIsGone] = useState(false);

  const randomizedColor = useMemo(() => {
    const alteredColor = new Color(color);
    alteredColor.multiplyScalar(randFloat(0.8, 1.1));
    return alteredColor;
  }, [color]);

  // This effect watches the `hit` prop. It only becomes true for SPECIAL tiles, making them fall.
  useEffect(() => {
    if (hit) {
      // The color change is already handled by isHit, so we just need to make it fall.
      const timeout = setTimeout(() => {
        setIsGone(true);
      }, TIME_BEFORE_FALL);
      return () => clearTimeout(timeout);
    }
  }, [hit]);

  if (isGone) {
    return null;
  }

  return (
    <RigidBody
      {...props}
      type="fixed"
      name="hexagon"
      colliders="hull"
      onCollisionEnter={(e) => {
        if (e.other.rigidBodyObject.name === "player" && !isHit) {
          // =======================================================
          // FIX: Immediately trigger the color change for ANY tile
          // =======================================================
          setIsHit(true);
          playAudio(`Pop${randInt(1, 5)}`);
          // =======================================================

          // If the tile is special, update the player's progress
          if (isSpecial) {
            const me = myPlayer();
            const currentTiles = me.getState("specialTilesHit") || 0;
            me.setState("specialTilesHit", currentTiles + 1);
          }
          
          // Call onHit to tell GameArena to handle special tile logic (falling)
          onHit?.();
        }
      }}
    >
      <mesh geometry={nodes.Hexagon.geometry}>
        <meshStandardMaterial
          {...materials.hexagon}
          color={isHit ? "#fff2cc" : randomizedColor} // Color now depends on local isHit state
        />
      </mesh>
    </RigidBody>
  );
}

useGLTF.preload("/models/hexagon.glb", "draco/gltf/");