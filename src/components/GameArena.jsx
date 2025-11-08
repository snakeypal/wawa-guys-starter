// src/components/GameArena.jsx
import { RPC, isHost, myPlayer } from "playroomkit";
import { Fragment, useRef, useEffect } from "react";
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
  { color: "red" }, { color: "blue" }, { color: "green" },
  { color: "yellow" }, { color: "purple" },
];

export const GameArena = () => {
  const { 
    setTreasureWorldPos, 
    treasureGridPos,
    specialTiles,
    hitTiles
  } = useGameState();
  const host = isHost();
  const groupRef = useRef();
  
  useEffect(() => {
    if (host && groupRef.current && treasureGridPos) {
      const isLastFloor = FLOORS.length - 1;
      const { rowIndex, colIndex } = treasureGridPos;
      const localPos = new Vector3(
        colIndex * HEX_X_SPACING + (rowIndex % 2 ? HEX_X_SPACING / 2 : 0),
        isLastFloor * -FLOOR_HEIGHT + 1.5,
        rowIndex * HEX_Z_SPACING
      );
      groupRef.current.updateMatrixWorld();
      const worldPos = groupRef.current.localToWorld(localPos);
      setTreasureWorldPos(worldPos);
    }
  }, [host, treasureGridPos]);

  // ✅ FIX: This safety check prevents the component from crashing on start.
  if (!treasureGridPos || !specialTiles) {
    return null;
  }

  // ✅ FIX: This correctly flattens the per-player tile object into a single list for rendering.
  const allSpecialTiles = Object.values(specialTiles).flat();

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
                
                const isSpecial = allSpecialTiles.some(t => 
                    t.floorIndex === floorIndex && 
                    t.rowIndex === rowIndex && 
                    t.colIndex === columnIndex
                );

                const isTreasure =
                  isLastFloor &&
                  treasureGridPos.rowIndex === rowIndex &&
                  treasureGridPos.colIndex === columnIndex;

                return (
                  <Fragment key={hexagonKey}>
                    <Hexagon
                      isSpecial={isSpecial}
                      position-x={columnIndex * HEX_X_SPACING}
                      color={floor.color}
                      hit={hitTiles[hexagonKey]} 
                      onHit={() => {
                          if (isSpecial) { // Only send RPC for special tiles
                            RPC.call("hexagonHit", { 
                                hexagonKey, 
                                playerId: myPlayer().id 
                            }, RPC.Mode.ALL);
                          }
                      }}
                    />
                    {isTreasure && (
                      <TreasureChest position-x={columnIndex * HEX_X_SPACING} position-y={1.5} />
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