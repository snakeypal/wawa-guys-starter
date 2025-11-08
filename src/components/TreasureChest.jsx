// src/components/TreasureChest.jsx
import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import { RigidBody } from "@react-three/rapier";

export function TreasureChest(props) {
  const { scene: chestScene } = useGLTF("/models/treasure_chest.glb", "draco/gltf/");
  const chestRef = useRef();

  return (
    <RigidBody
      type="fixed"
      colliders="hull"
      ref={chestRef}
      {...props}
      name="treasureChest"
    >
      <primitive object={chestScene.clone()} scale={[0.5, 0.5, 0.5]} />
    </RigidBody>
  );
}

useGLTF.preload("/models/treasure_chest.glb", "draco/gltf/");