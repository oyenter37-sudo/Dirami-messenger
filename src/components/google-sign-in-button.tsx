"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/google-config";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "filled_black";
      size: "large";
      text: "continue_with";
      shape: "pill";
      logo_alignment: "left";
      width: number;
      locale: string;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  }
}

export function GoogleSignInButton({
  disabled = false,
  onCredential,
}: {
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.google?.accounts?.id),
  );

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const api = window.google?.accounts?.id;
    const container = containerRef.current;
    if (!ready || !api || !container) return;

    api.initialize({
      client_id: GOOGLE_CLIENT_ID,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        if (response.credential) callbackRef.current(response.credential);
      },
    });
    container.replaceChildren();
    const availableWidth = Math.floor(
      container.getBoundingClientRect().width || 320,
    );
    api.renderButton(container, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
      width: Math.max(200, Math.min(320, availableWidth)),
      locale: "ru",
    });
  }, [ready]);

  return (
    <>
      <Script
        onReady={() => setReady(true)}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div
        className={`flex min-h-11 w-full justify-center overflow-hidden transition ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
        ref={containerRef}
      />
    </>
  );
}
