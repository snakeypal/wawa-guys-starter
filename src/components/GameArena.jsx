// src/components/GameArena.jsx
import { RPC, isHost } from "playroomkit";
import { useState, useMemo, Fragment, useRef, useEffect } from "react";
import { Vector3 } from "three";
import { useGameState } from "../hooks/useGameState";
import { Hexagon } from "./Hexagon";
import { TreasureChest } from "./TreasureChest";

export const HEX_X_SPACING = 2.25;
export const HEX_Z_SPACING = 1.95;
export const NB_ROWS = 7;
export const NB_COLUMNS = 7;
export const FLOOR_HEIGHT = 10;
export const FLOORS = [
  { color: "red" },
  { color: "blue" },
  { color: "green" },
  { color: "yellow" },
  { color: "purple" },
];

export const GameArena = () => {
  const [hexagonHit, setHexagonHit] = useState({});
  const { setTreasureWorldPos } = useGameState();
  const host = isHost();
  const groupRef = useRef();

  // Random special tiles for each floor
  const specialTiles = useMemo(() => {
    return FLOORS.map(() => {
      const rowIndex = Math.floor(Math.random() * NB_ROWS);
      const colIndex = Math.floor(Math.random() * NB_COLUMNS);
      return { rowIndex, colIndex };
    });
  }, []);

  // Random TreasureChest position only on the LAST floor
  const treasurePosition = useMemo(() => {
    const rowIndex = Math.floor(Math.random() * NB_ROWS);
    const colIndex = Math.floor(Math.random() * NB_COLUMNS);
    return { rowIndex, colIndex };
  }, []);

  useEffect(() => {
    if (host && groupRef.current) {
      const isLastFloor = FLOORS.length - 1;
      const { rowIndex, colIndex } = treasurePosition;

      // Calculate local position
      const localPos = new Vector3(
        colIndex * HEX_X_SPACING + (rowIndex % 2 ? HEX_X_SPACING / 2 : 0),
        isLastFloor * -FLOOR_HEIGHT + 1.5, // 1.5 is the chest's height offset
        rowIndex * HEX_Z_SPACING
      );

      // Convert to world position
      groupRef.current.updateMatrixWorld();
      const worldPos = groupRef.current.localToWorld(localPos);
      setTreasureWorldPos(worldPos);
    }
  }, [host, treasurePosition, setTreasureWorldPos]);

  RPC.register("hexagonHit", (data) => {
    setHexagonHit((prev) => ({
      ...prev,
      [data.hexagonKey]: true,
    }));
  });

  return (
    <group
      ref={groupRef}
      position-x={-((NB_COLUMNS - 1) / 2) * HEX_X_SPACING}
      position-z={-((NB_ROWS - 1) / 2) * HEX_Z_SPACING}
    >
      {FLOORS.map((floor, floorIndex) => (
        <group key={floorIndex} position-y={floorIndex * -FLOOR_HEIGHT}>
          {[...Array(NB_ROWS)].map((_, rowIndex) => (
            <group key={rowIndex} position-z={rowIndex * HEX_Z_SPACING} position-x={rowIndex % 2 ? HEX_X_SPACING / 2 : 0}>
              {[...Array(NB_COLUMNS)].map((_, columnIndex) => {
                const hexagonKey = `${floorIndex}-${rowIndex}-${columnIndex}`;
                const isLastFloor = floorIndex === FLOORS.length - 1;
                const isSpecial =
                  !isLastFloor &&
                  specialTiles[floorIndex].rowIndex === rowIndex &&
                  specialTiles[floorIndex].colIndex === columnIndex;
                const isTreasure =
                  isLastFloor &&
                  treasurePosition.rowIndex === rowIndex &&
                  treasurePosition.colIndex === columnIndex;

                return (
                  <Fragment key={hexagonKey}>
                    <Hexagon
                      isSpecial={isSpecial}
                      position-x={columnIndex * HEX_X_SPACING}
                      color={floor.color} // Simplified color logic
                      // =======================================================
                      // FIX: Restored onHit logic to trigger falls
                      // =======================================================
                      onHit={() => {
                        if (isSpecial) {
                          setHexagonHit((prev) => ({...prev, [hexagonKey]: true,}));
                          RPC.call("hexagonHit", { hexagonKey }, RPC.Mode.ALL);
                        }
                      }}
                      hit={hexagonHit[hexagonKey]} // Pass the hit state down
                      // =======================================================
                    />
                    {isTreasure && (
                      <TreasureChest position-x={columnIndex * HEX_X_SPACING} position-y={1.5} scale={[0.1, 0.1, 0.1]} />
                    )}
                  </Fragment>
                );
              })}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};