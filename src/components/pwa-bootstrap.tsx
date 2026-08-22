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

const INSTALL_STORAGE_KEY = "dirami-app-installed";

function runsStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function rememberDiramiInstalled(installed = true) {
  if (typeof window === "undefined") return;
  try {
    if (installed) window.localStorage.setItem(INSTALL_STORAGE_KEY, "1");
    else window.localStorage.removeItem(INSTALL_STORAGE_KEY);
  } catch {
    // Installation detection still works in standalone mode without storage.
  }
}

export function isDiramiInstalled() {
  if (typeof window === "undefined") return false;
  if (runsStandalone()) return true;
  try {
    return window.localStorage.getItem(INSTALL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function PwaBootstrap() {
  useEffect(() => {
    if (runsStandalone()) rememberDiramiInstalled();

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__diramiInstallPrompt = event as DiramiInstallPrompt;
      if (!runsStandalone()) rememberDiramiInstalled(false);
      window.dispatchEvent(new Event("dirami-install-available"));
    };
    const installed = () => {
      window.__diramiInstallPrompt = null;
      rememberDiramiInstalled();
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
