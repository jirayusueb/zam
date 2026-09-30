import React from "react";
import ReactDOM from "react-dom/client";

import { PopupApp } from "@/app/popup/popup-app";

import "@/app/styles/index.css";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Missing #root element");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
