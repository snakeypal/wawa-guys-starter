// src/main.jsx

import React from "react";
// Change this line:
// import { createRoot } from "react-dom"; 
// To this:
import { createRoot } from "react-dom/client"; // ✅ CORRECTED IMPORT
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);