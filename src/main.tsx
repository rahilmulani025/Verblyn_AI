import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register production-safe service worker for PWA
if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PWA] ServiceWorker registration notice:", err);
        }
      });
  });
}

