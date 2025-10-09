// src/components/UI.jsx
import { openDiscordInviteDialog } from "playroomkit";
import { useAudioManager } from "../hooks/useAudioManager";
import { useGameState } from "../hooks/useGameState";

export const UI = () => {
  const { 
    audioEnabled, 
    setAudioEnabled,
    timer, 
    startGame, 
    host, 
    stage, 
    players, 
    winner, 
    interactionMessage, 
    triggerRespawn // This line will now work correctly
  } = useGameState();

  return (
    <main
      className={`fixed z-10 inset-0 pointer-events-none grid place-content-center ${
        stage === "lobby" || stage === "winner" ? "bg-black/40" : "bg-transparent"
      } transition-colors duration-1000`}
    >
      {/* Player Avatars */}
      <div className="absolute top-28 left-4 md:top-4 md:-translate-x-1/2 md:left-1/2 flex flex-col md:flex-row gap-4">
        {players.map((p) => (
          <div key={p.state.id} className="flex flex-col items-center">
            <img
              className={`w-12 h-12 rounded-full ${p.state.getState("dead") ? "filter grayscale" : ""}`}
              src={p.state.state.profile.photo}
            />
            <p className="text-white max-w-20 truncate">
              {p.state.state.profile.name}
            </p>
          </div>
        ))}
      </div>

      {/* Timer */}
      {timer >= 0 && (
        <h2 className="absolute right-4 top-4 text-5xl text-white font-black">
          {timer}
        </h2>
      )}

      <img src="images/logo.png" className="absolute top-4 left-4 w-28" />

      {/* LOBBY UI */}
      {stage === "lobby" && (
        <div className="flex flex-col items-center">
          {host ? (
            <button
              className="pointer-events-auto bg-gradient-to-br from-orange-500 to-yellow-500 hover:opacity-80 transition-all duration-200 px-12 py-4 rounded-lg font-black text-xl text-white drop-shadow-lg"
              onClick={startGame}
            >
              START
            </button>
          ) : (
            <p className="italic text-white">
              Waiting for the host to start the game...
            </p>
          )}
          <button
            className="mt-4 pointer-events-auto bg-gradient-to-br from-orange-500 to-yellow-500 hover:opacity-80 transition-all duration-200 px-12 py-4 rounded-lg font-black text-xl text-white drop-shadow-lg"
            onClick={openDiscordInviteDialog}
          >
            INVITE
          </button>
        </div>
      )}

      {/* WINNER UI */}
      {stage === "winner" && winner && (
        <div className="text-center">
          <h2 className="text-6xl text-white font-black drop-shadow-lg">
            WINNER!
          </h2>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img
              className="w-16 h-16 rounded-full"
              src={winner.photo}
            />
            <h3 className="text-4xl text-white font-bold">{winner.name}</h3>
          </div>
        </div>
      )}

      {/* INTERACTION MESSAGE UI */}
      {interactionMessage && (
        <h3 className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-md">
          {interactionMessage}
        </h3>
      )}

      {/* "TOP" BUTTON */}
      {stage === "game" && (
        <button
          className="absolute top-4 right-20 pointer-events-auto bg-black/40 text-white font-black px-4 py-2 rounded-md hover:bg-black/60"
          onClick={triggerRespawn}
        >
          TOP
        </button>
      )}

      {/* Audio Button */}
      <button
        className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto"
        onClick={() => setAudioEnabled(!audioEnabled)}
      >
        {audioEnabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="to 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 fill-white stroke-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 fill-white stroke-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        )}
      </button>
    </main>
  );
};