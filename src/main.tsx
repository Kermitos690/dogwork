import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

// Global unhandled error & rejection handlers for production monitoring
window.addEventListener("error", (event) => {
  console.error("[GLOBAL] Uncaught error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[GLOBAL] Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
