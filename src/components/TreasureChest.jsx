import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import { RigidBody } from "@react-three/rapier";

export function TreasureChest(props) {
  // Load the chest model; replace with your path
  const { scene: chestScene, nodes, materials, animations } = useGLTF("/models/treasure_chest.glb", "draco/gltf/");

  const chestRef = useRef();

  return (
    <RigidBody
      type="fixed" // or dynamic if you want physics
      colliders="hull"
      ref={chestRef}
      {...props} // position, rotation, etc.
      name="treasureChest"
    >
      <primitive object={chestScene} />
    </RigidBody>
  );
}

useGLTF.preload("/models/treasure_chest.glb", "draco/gltf/");
