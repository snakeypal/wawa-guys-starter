// src/hooks/useGameState.jsx
import {
  Joystick,
  onPlayerJoin,
  useMultiplayerState,
  isHost,
  RPC,
  insertCoin,
  myPlayer,
} from "playroomkit";
import { createContext, useContext, useRef, useEffect, useState } from "react";
import { randFloat } from "three/src/math/MathUtils.js";
import {
  HEX_X_SPACING,
  HEX_Z_SPACING,
  NB_COLUMNS,
  NB_ROWS,
  FLOORS,
} from "../components/GameArena";

const GameStateContext = createContext();

const NEXT_STAGE = {
  lobby: "countdown",
  countdown: "game",
  game: "winner",
  winner: "landing",
};

const TIMER_STAGE = {
  lobby: -1,
  countdown: 3,
  game: 0,
  winner: 10,
};

export const requiredTiles = FLOORS.length; // One special tile per floor

// Helper function to generate unique special tiles for each player, ensuring no overlap per floor position
const generateSpecialTiles = (players) => {
  const newSpecialTiles = {};
  const usedFloorPositions = new Set(); // To track {floorIndex}-{rowIndex}-{colIndex} to avoid overlaps

  players.forEach((p) => {
    const playerTiles = [];
    for (let i = 0; i < requiredTiles; i++) {
      let rowIndex, colIndex, floorIndex, key;
      do {
        floorIndex = i; // One tile per floor
        rowIndex = Math.floor(Math.random() * NB_ROWS);
        colIndex = Math.floor(Math.random() * NB_COLUMNS);
        key = `${floorIndex}-${rowIndex}-${colIndex}`;
      } while (usedFloorPositions.has(key)); // Ensure no other player uses this exact floor-position combo
      
      usedFloorPositions.add(key); // Mark this floor-position as used
      playerTiles.push({ floorIndex, rowIndex, colIndex });
    }
    newSpecialTiles[p.id] = playerTiles;
  });
  return newSpecialTiles;
};


export const GameStateProvider = ({ children }) => {
  const [stage, setStage] = useMultiplayerState("gameStage", "landing");
  const [timer, setTimer] = useMultiplayerState("timer", TIMER_STAGE.lobby);
  const [players, setPlayers] = useState([]);
  const [soloGame, setSoloGame] = useMultiplayerState("soloGame", false);
  const [winner, setWinner] = useMultiplayerState("winner", null);
  const [leaderboard, setLeaderboard] = useMultiplayerState("leaderboard", []);
  
  const [treasureGridPos, setTreasureGridPos] = useMultiplayerState("treasureGridPos", null);
  const [specialTiles, setSpecialTiles] = useMultiplayerState("specialTiles", null);
  const [hitTiles, setHitTiles] = useMultiplayerState("hitTiles", {}); // Stores which tiles have been hit, regardless of who hit them.
                                                                        // Format: { "floor-row-col": true }


  const [interactionMessage, setInteractionMessage] = useState("");
  const [treasureWorldPos, setTreasureWorldPos] = useState(null);
  const [respawn, setRespawn] = useState(false);
  const [roomCode, setRoomCode] = useMultiplayerState("roomCode", null);
  const host = isHost();
  const isInit = useRef(false);
  
  const playersRef = useRef(players);
  const specialTilesRef = useRef(specialTiles);
  useEffect(() => {
    playersRef.current = players;
    specialTilesRef.current = specialTiles;
  }, [players, specialTiles]);


  useEffect(() => {
    if (isInit.current) return;
    isInit.current = true;

    onPlayerJoin((state) => {
      const controls = new Joystick(state, {
        type: "angular",
        buttons: [ { id: "Jump", label: "Jump" }, { id: "Boost", label: "BST" } ],
      });
      const newPlayer = { state, controls };

      if (host) {
        state.setState("dead", stage === "game");
        state.setState("specialTilesCollected", 0); // Renamed for clarity
        state.setState("startingPos", {
          x: randFloat( (-(NB_COLUMNS - 1) * HEX_X_SPACING) / 2, ((NB_COLUMNS - 1) * HEX_X_SPACING) / 2 ),
          y: 5,
          z: randFloat( (-(NB_ROWS - 1) * HEX_Z_SPACING) / 2, ((NB_ROWS - 1) * HEX_Z_SPACING) / 2 ),
        });
      }
      setPlayers((currentPlayers) => [...currentPlayers, newPlayer]);
      state.onQuit(() => {
        setPlayers((currentPlayers) => currentPlayers.filter((p) => p.state.id !== state.id));
      });
    });

    RPC.register("playerWon", (playerProfile) => {
      if (host) playerWins(playerProfile);
    });
    
    RPC.register("hexagonHit", (data) => {
        if (!host) return; 

        const currentPlayers = playersRef.current;
        const currentSpecialTiles = specialTilesRef.current;
        if (!currentSpecialTiles) return;

        const player = currentPlayers.find((p) => p.state.id === data.playerId);
        if (!player) return;

        // Check if the tile hit is *this player's* special tile
        const playerSpecialTiles = currentSpecialTiles[data.playerId] || [];
        const isPlayerSpecificSpecialTile = playerSpecialTiles.some(t => 
            `${t.floorIndex}-${t.rowIndex}-${t.colIndex}` === data.hexagonKey
        );
        
        // Only register a hit if it's a special tile for the current player AND it hasn't been hit yet globally
        if (isPlayerSpecificSpecialTile && !hitTiles[data.hexagonKey]) {
            setHitTiles(prev => {
                const currentScore = player.state.getState("specialTilesCollected") || 0;
                player.state.setState("specialTilesCollected", currentScore + 1, true);
                return {...prev, [data.hexagonKey]: true}; // Mark this tile as globally hit
            }, true);
        }
    });

  }, []);

  const playerWins = (playerProfile) => {
    if (stage === "winner") return;
    setStage("winner", true);
    setWinner(playerProfile, true);
    setTimer(TIMER_STAGE.winner, true);
    const winTime = timer; // Capture current timer value
    const newLeaderboard = [...leaderboard, { ...playerProfile, time: winTime }];
    newLeaderboard.sort((a, b) => a.time - b.time); // Sort by shortest time
    setLeaderboard(newLeaderboard, true);
  };
  
  const resetGameState = (nextStage) => {
    players.forEach((p) => {
        p.state.setState("dead", false);
        p.state.setState("pos", null);
        p.state.setState("rot", null);
        p.state.setState("specialTilesCollected", 0); // Reset collected tiles
    });
    setWinner(null, true);
    setLeaderboard([], true);
    setSpecialTiles(null, true);
    setHitTiles({}, true);
    setTreasureGridPos(null, true);
    setStage(nextStage, true);
    setTimer(TIMER_STAGE[nextStage], true);
  };

  useEffect(() => {
    if (!host) return;
    if (stage === "landing" || stage === "lobby") return;

    const timeout = setTimeout(() => {
      let newTime = stage === "game" ? timer + 1 : timer - 1;
      
      if (newTime <= 0) {
        const nextStage = NEXT_STAGE[stage];
        
        if (nextStage === "game") {
          setStage(nextStage, true);
          setTimer(TIMER_STAGE[nextStage], true);
        } else {
          resetGameState(nextStage);
        }

      } else {
        setTimer(newTime, true);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [host, timer, stage]);

  const setupNewGame = (allPlayers) => {
    if (!host || allPlayers.length === 0) return;
    setTreasureGridPos({
        rowIndex: Math.floor(Math.random() * NB_ROWS),
        colIndex: Math.floor(Math.random() * NB_COLUMNS),
    }, true);
    setSpecialTiles(generateSpecialTiles(allPlayers), true);
    setHitTiles({}, true);
    setStage("countdown", true);
    setTimer(TIMER_STAGE.countdown, true);
  };

  const startSoloGame = async () => {
    try {
      await insertCoin({ gameId: "ePDES33fDskhbXARjSUE", skipLobby: true, discord:true });
      setSoloGame(true, true);
      setTimeout(() => {
        const me = myPlayer();
        if(me) setupNewGame([me]);
      }, 200);
    } catch (err) {
      console.error("Error starting solo game:", err);
    }
  };

  const startMultiplayerGame = () => {
    setSoloGame(false, true);
    const allPlayers = players.map(p => p.state);
    setupNewGame(allPlayers);
  };

  const enterLobby = () => {
    setStage("lobby", true);
    setTimer(TIMER_STAGE.lobby, true);
    setSoloGame(false, true);
  };
  
  const exitGame = () => window.location.reload();
  const triggerRespawn = () => setRespawn(true);

  return (
    <GameStateContext.Provider value={{
      stage, timer, players, host, winner, leaderboard, interactionMessage, setInteractionMessage,
      treasureWorldPos, setTreasureWorldPos, respawn, setRespawn, triggerRespawn,
      startSoloGame, startMultiplayerGame, enterLobby, playerWins, exitGame,
      requiredTiles, specialTiles, hitTiles, treasureGridPos,
      setRoomCode
    }}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => useContext(GameStateContext);