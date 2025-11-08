// src/components/Hexagon.jsx
import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import React, { useEffect, useMemo, useState } from "react";
import { Color } from "three";
import { randFloat, randInt } from "three/src/math/MathUtils.js";
import { useAudioManager } from "../hooks/useAudioManager";

const TIME_BEFORE_FALL = 200; 

export function Hexagon({ color, onHit, hit, isSpecial, ...props }) {
  const { playAudio } = useAudioManager();
  const { nodes, materials } = useGLTF("/models/hexagon.glb", "draco/gltf/");
  const [justHit, setJustHit] = useState(false);
  const [isGone, setIsGone] = useState(false);

  const randomizedColor = useMemo(() => {
    const alteredColor = new Color(color);
    alteredColor.multiplyScalar(randFloat(0.8, 1.1));
    return alteredColor;
  }, [color]);

  useEffect(() => {
    if (hit) {
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
        if (e.other.rigidBodyObject?.name === "player" && !justHit && !hit) {
          setJustHit(true); 
          playAudio(`Pop${randInt(1, 5)}`);
          onHit?.(); // Call the function passed from GameArena to send the RPC
        }
      }}
    >
      <mesh geometry={nodes.Hexagon.geometry}>
        <meshStandardMaterial
          {...materials.hexagon}
          color={isSpecial ? "gold" : (justHit || hit) ? "#fff2cc" : randomizedColor}
        />
      </mesh>
    </RigidBody>
  );
}

useGLTF.preload("/models/hexagon.glb", "draco/gltf/");