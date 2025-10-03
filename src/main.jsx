import React from "react";
import { createRoot } from "react-dom/client";  // React 18 import
import App from "./App";
import "./index.css";
import { insertCoin } from "playroomkit";

insertCoin({ skipLobby: true,
  gameId:"ePDES33fDskhbXARjSUE",
  discord:true,

 }).then(() => {
  const root = createRoot(document.getElementById("root"));  // React 18 way
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});