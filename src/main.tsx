import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render React app first
createRoot(document.getElementById("root")!).render(<App />);

// Initialize Capacitor after React is mounted (async, non-blocking)
import("./capacitor-init").then(({ initCapacitor }) => {
  initCapacitor();
});
