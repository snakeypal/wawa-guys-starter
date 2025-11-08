// src/components/UI.jsx
import { openDiscordInviteDialog, myPlayer, insertCoin } from "playroomkit";
import { useAudioManager } from "../hooks/useAudioManager";
import { useGameState } from "../hooks/useGameState";
import { useState } from "react";

//
// ----------------------------
// LANDING SCREEN
// ----------------------------
const LandingScreen = ({ startSoloGame, enterLobby, exitGame }) => {
  const [loading, setLoading] = useState(false);
  const { setRoomCode } = useGameState();

  // This is the single entry point for all players in a Discord Activity.
  const handleMultiplayer = async () => {
    setLoading(true);
    try {
      console.log("🎮 Initializing Discord Activity session...");
      // This call connects the player to the session defined by the Discord Activity.
      // It correctly returns 'undefined' and does not use a roomCode.
      await insertCoin({
        gameId: "ePDES33fDskhbXARjSUE", // Your Game ID
        skipLobby: true,
        discord: true,
      });

      // If no error is thrown, the connection is successful.
      console.log("✅ Connection successful. Entering lobby.");
      
      // Set a placeholder so the UI knows we're in a Discord lobby.
      setRoomCode("Discord Activity", true);
      enterLobby();

    } catch (err)      {
      console.error("❌ Error initializing session:", err);
      alert("Failed to start activity. Please check console logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSolo = async () => {
    setLoading(true);
    await startSoloGame();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-5xl font-black text-white mb-2">CARTRIDGE WARS</h1>

      <button
        disabled={loading}
        className="pointer-events-auto bg-gradient-to-br from-yellow-500 to-orange-500 hover:opacity-90 px-10 py-4 rounded-xl text-white font-bold text-xl"
        onClick={handleMultiplayer}
      >
        Start Multiplayer
      </button>

      <button
        disabled={loading}
        className="pointer-events-auto bg-gradient-to-br from-purple-600 to-indigo-600 hover:opacity-90 px-10 py-4 rounded-xl text-white font-bold text-xl mt-4"
        onClick={handleStartSolo}
      >
        Start Solo Game (for testing)
      </button>

      <button
        className="mt-4 pointer-events-auto bg-gray-600 hover:opacity-90 px-6 py-3 rounded-lg text-white"
        onClick={exitGame}
      >
        Exit / Reset
      </button>

      {loading && (
        <p className="text-yellow-300 mt-2 text-lg animate-pulse">
          Connecting...
        </p>
      )}
    </div>
  );
};

//
// ----------------------------
// MAIN UI
// ----------------------------
const MAX_PLAYERS = 4;
export const UI = () => {
  const {
    audioEnabled,
    setAudioEnabled,
    timer,
    host,
    stage,
    players,
    winner,
    interactionMessage,
    triggerRespawn,
    requiredTiles,
    leaderboard,
    startSoloGame,
    startMultiplayerGame,
    enterLobby,
    exitGame,
  } = useGameState();

  const me = myPlayer?.();
  useAudioManager();

  const HostLobbyControls = () => (
    <div className="flex flex-col items-center">
      <h3 className="text-white text-lg mb-2">
        Players: {players.length} / {MAX_PLAYERS}
      </h3>
      <button
        className="pointer-events-auto bg-gradient-to-br from-orange-500 to-yellow-500 hover:opacity-80 transition-all duration-200 px-12 py-4 rounded-lg font-black text-xl text-white drop-shadow-lg"
        onClick={() => startMultiplayerGame()}
      >
        START GAME
      </button>

      {/* Lobby Code is not displayed for Discord Activities */}

      <button
        className="mt-4 pointer-events-auto bg-gradient-to-br from-green-500 to-teal-500 hover:opacity-80 transition-all duration-200 px-12 py-4 rounded-lg font-black text-xl text-white drop-shadow-lg"
        onClick={openDiscordInviteDialog}
      >
        INVITE OTHERS
      </button>
    </div>
  );

  const GuestLobbyControls = () => (
    <p className="italic text-white">
      Waiting for the host to start the game...
    </p>
  );

  return (
    <main
      className={`fixed z-10 inset-0 pointer-events-none grid place-content-center ${
        stage === "lobby" || stage === "winner"
          ? "bg-black/40"
          : "bg-transparent"
      } transition-colors duration-1000`}
    >
      {/* Player list */}
      <div className="absolute top-28 left-4 md:top-4 md:left-4 flex flex-col md:flex-row gap-4">
        {players.map((p) => (
          <div key={p.state.id} className="flex flex-col items-center">
            <img
              className={`w-12 h-12 rounded-full ${
                p.state.getState("dead") ? "filter grayscale" : ""
              }`}
              src={p.state.state.profile.photo}
              alt={p.state.state.profile.name}
            />
            <p className="text-white max-w-20 truncate">
              {p.state.state.profile.name}
            </p>
            {stage === "game" && (
              <p
                className={`text-sm font-bold ${
                  p.state.getState("dead")
                    ? "text-red-400"
                    : "text-yellow-300"
                }`}
              >
                {p.state.getState("specialTilesCollected") || 0} / {requiredTiles}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Timer */}
      {timer >= 0 && (
        <h2 className="absolute right-4 top-4 text-5xl text-white font-black">
          {timer}
        </h2>
      )}

      {/* Logo */}
      <img src="images/logo.png" className="absolute top-4 left-4 w-28" />

      {/* Landing */}
      {stage === "landing" && (
        <div className="pointer-events-auto p-6">
          <LandingScreen
            startSoloGame={startSoloGame}
            enterLobby={enterLobby}
            exitGame={exitGame}
          />
        </div>
      )}

      {/* Lobby */}
      {stage === "lobby" && (
        <div className="flex flex-col items-center pointer-events-auto">
          {host ? <HostLobbyControls /> : <GuestLobbyControls />}
          <button
            className="mt-6 px-4 py-2 rounded-md bg-gray-700 text-white"
            onClick={() => exitGame()}
          >
            Exit / Back to Landing
          </button>
        </div>
      )}

      {/* Winner screen */}
      {stage === "winner" && (
        <div className="text-center pointer-events-auto">
          <h2 className="text-6xl text-white font-black drop-shadow-lg mb-8">
            GAME OVER!
          </h2>
          {leaderboard.length > 0 && (
            <div className="bg-black/70 p-6 rounded-xl">
              <h3 className="text-3xl text-yellow-400 font-black mb-4">
                LEADERBOARD
              </h3>
              {leaderboard.map((profile, index) => (
                <div
                  key={profile.id}
                  className={`flex items-center justify-start gap-4 py-2 px-4 rounded-lg mb-2 ${
                    index === 0
                      ? "bg-yellow-500/30"
                      : index === 1
                      ? "bg-gray-400/30"
                      : "bg-orange-500/30"
                  }`}
                >
                  <span className="text-3xl font-black text-white w-8 text-left">
                    #{index + 1}
                  </span>
                  <img
                    className="w-12 h-12 rounded-full"
                    src={profile.photo}
                    alt={profile.name}
                  />
                  <h3 className="text-2xl text-white font-bold">
                    {profile.name}
                  </h3>
                  {index === 0 && (
                    <span className="text-xl text-yellow-300 ml-auto">
                      (WINNER!)
                    </span>
                  )}
                </div>
              ))}
              <div className="mt-6">
                <button
                  className="px-4 py-2 rounded-md bg-gray-700 text-white"
                  onClick={() => exitGame()}
                >
                  Back to Landing
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interaction message */}
      {interactionMessage && (
        <h3 className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-md pointer-events-none">
          {interactionMessage}
        </h3>
      )}

      {/* Respawn / TOP */}
      {stage === "game" && (
        <button
          className="absolute top-4 right-20 pointer-events-auto bg-black/40 text-white font-black px-4 py-2 rounded-md hover:bg-black/60"
          onClick={triggerRespawn}
        >
          TOP
        </button>
      )}

      {/* Audio toggle */}
      <button
        className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto"
        onClick={() => setAudioEnabled(!audioEnabled)}
      >
        {audioEnabled ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 fill-white stroke-white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 fill-white stroke-white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
            />
          </svg>
        )}
      </button>
    </main>
  );
};