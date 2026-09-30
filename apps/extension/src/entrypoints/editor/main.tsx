import React from "react";
import ReactDOM from "react-dom/client";

import { EditorPage } from "@/pages/editor";

import "@/app/styles/index.css";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Missing #root element");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <EditorPage />
  </React.StrictMode>
);
