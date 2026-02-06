import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor } from "./capacitor-init";

// Initialize Capacitor for native platforms
initCapacitor();

createRoot(document.getElementById("root")!).render(<App />);
