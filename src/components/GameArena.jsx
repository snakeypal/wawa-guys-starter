import { RPC } from "playroomkit";
import { useState, useMemo } from "react";
import { Hexagon } from "./Hexagon";
import { RigidBody } from "@react-three/rapier";
import { TreasureChest } from "./TreasureChest"; // import the chest component

export const GameArena = () => {
  const [hexagonHit, setHexagonHit] = useState({});
  const [visitedTiles, setVisitedTiles] = useState({});

  const specialTiles = useMemo(() => {
    return FLOORS.map(() => {
      const rowIndex = Math.floor(Math.random() * NB_ROWS);
      const colIndex = Math.floor(Math.random() * NB_COLUMNS);
      return { rowIndex, colIndex };
    });
  }, []);

  RPC.register("hexagonHit", (data) => {
    setHexagonHit((prev) => ({
      ...prev,
      [data.hexagonKey]: true,
    }));
  });

  const wallHeight = (FLOORS.length - 1) * FLOOR_HEIGHT + 5;
  const wallYPosition = -((FLOORS.length - 1) * FLOOR_HEIGHT) / 2;

  const gridWidth = (NB_COLUMNS - 1) * HEX_X_SPACING + HEX_X_SPACING / 2;
  const gridDepth = (NB_ROWS - 1) * HEX_Z_SPACING;
  const gridCenterX = gridWidth / 2;
  const gridCenterZ = gridDepth / 2;

  return (
    <group
      position-x={-((NB_COLUMNS - 1) / 2) * HEX_X_SPACING}
      position-z={-((NB_ROWS - 1) / 2) * HEX_Z_SPACING}
    >
      {/* HEXAGONS */}
      {FLOORS.map((floor, floorIndex) => (
        <group key={floorIndex} position-y={floorIndex * -FLOOR_HEIGHT}>
          {[...Array(NB_ROWS)].map((_, rowIndex) => (
            <group
              key={rowIndex}
              position-z={rowIndex * HEX_Z_SPACING}
              position-x={rowIndex % 2 ? HEX_X_SPACING / 2 : 0}
            >
              {[...Array(NB_COLUMNS)].map((_, columnIndex) => {
                const hexagonKey = `${floorIndex}-${rowIndex}-${columnIndex}`;
                const isSpecial =
                  specialTiles[floorIndex].rowIndex === rowIndex &&
                  specialTiles[floorIndex].colIndex === columnIndex;
                return (
                  <Hexagon
                    key={columnIndex}
                    position-x={columnIndex * HEX_X_SPACING}
                    color={
                      visitedTiles[hexagonKey] ? "white" : floor.color
                    }
                    onHit={() => {
                      setVisitedTiles((prev) => ({
                        ...prev,
                        [hexagonKey]: true,
                      }));
                      if (isSpecial) {
                        setHexagonHit((prev) => ({
                          ...prev,
                          [hexagonKey]: true,
                        }));
                        RPC.call("hexagonHit", { hexagonKey }, RPC.Mode.ALL);
                      }
                    }}
                    hit={hexagonHit[hexagonKey]}
                  />
                );
              })}
            </group>
          ))}
        </group>
      ))}

      {/* INVISIBLE WALLS (colliders only) */}
      <RigidBody type="fixed" colliders="cuboid" position={[gridCenterX, wallYPosition, gridDepth + 1]} />
      <RigidBody type="fixed" colliders="cuboid" position={[gridCenterX, wallYPosition, -1]} />
      <RigidBody type="fixed" colliders="cuboid" position={[gridWidth + 1, wallYPosition, gridCenterZ]} />
      <RigidBody type="fixed" colliders="cuboid" position={[-1, wallYPosition, gridCenterZ]} />

      {/* Place the chest at the bottom (last) floor */}
      <TreasureChest
        position={[gridCenterX, -FLOOR_HEIGHT * (FLOORS.length - 1), gridCenterZ]}
        scale={[1, 1, 1]}
      />
    </group>
  );
};
