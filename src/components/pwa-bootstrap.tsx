"use client";

import { useEffect } from "react";

export type DiramiInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __diramiInstallPrompt?: DiramiInstallPrompt | null;
  }
}

export function PwaBootstrap() {
  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__diramiInstallPrompt = event as DiramiInstallPrompt;
      window.dispatchEvent(new Event("dirami-install-available"));
    };
    const installed = () => {
      window.__diramiInstallPrompt = null;
      window.dispatchEvent(new Event("dirami-app-installed"));
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", installed);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* The messenger remains fully usable without service workers. */
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  return null;
}
