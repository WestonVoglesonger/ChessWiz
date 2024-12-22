import React from "react";
import ReactDOM from "react-dom/client";
import ChessWiz from "./components/ChessWiz";
import "./input.css";
import "chessboard-element";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found! Make sure it exists in the HTML.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ChessWiz />
    </React.StrictMode>
  );
}
