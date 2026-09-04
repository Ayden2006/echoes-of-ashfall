import { createRoot } from "react-dom/client";
import AshfallGame from "../app/game";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Echoes of Ashfall needs a #root element.");
}
createRoot(root).render(<AshfallGame />);
