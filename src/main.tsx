import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

const BUILD_FINGERPRINT = "2026-04-20T15:05Z";
const CHUNK_RELOAD_KEY = `dogwork:chunk-reload:${BUILD_FINGERPRINT}`;

function reloadOnceForStaleAssets(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  const isStaleAssetError =
    message.includes("Importing a module script failed") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("ChunkLoadError");

  if (!isStaleAssetError) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const preloadEvent = event as Event & { payload?: unknown };
  reloadOnceForStaleAssets(preloadEvent.payload);
});

// Global unhandled error & rejection handlers for production monitoring
window.addEventListener("error", (event) => {
  console.error("[GLOBAL] Uncaught error:", event.error);
  reloadOnceForStaleAssets(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[GLOBAL] Unhandled promise rejection:", event.reason);
  reloadOnceForStaleAssets(event.reason);
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
