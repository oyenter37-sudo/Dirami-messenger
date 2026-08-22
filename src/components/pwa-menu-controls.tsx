"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  isDiramiInstalled,
  rememberDiramiInstalled,
  type DiramiInstallPrompt,
} from "@/components/pwa-bootstrap";

function MenuShell({
  icon,
  title,
  hint,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="group flex w-full items-center gap-3 rounded-[1.25rem] border border-transparent px-3 py-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-muted text-accent-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-[11px] leading-4 text-[var(--muted-2)]">
          {hint}
        </span>
      </span>
      <span className="text-lg text-[var(--muted-2)] transition group-hover:translate-x-0.5">
        ›
      </span>
    </button>
  );
}

function InstallIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <rect
        height="17"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
        width="13"
        x="5.5"
        y="3.5"
      />
      <path
        d="M12 7v7m0 0 2.7-2.7M12 14l-2.7-2.7M9.5 17.5h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 10.2c0-3.5 2.2-5.7 5.5-5.7s5.5 2.2 5.5 5.7v3.1l1.5 2.5H5l1.5-2.5v-3.1Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M9.8 18.2c.5.9 1.2 1.3 2.2 1.3s1.7-.4 2.2-1.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function InstallAppMenuItem() {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<DiramiInstallPrompt | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setInstalled(isDiramiInstalled());
      setPrompt(window.__diramiInstallPrompt ?? null);
    };
    refresh();
    window.addEventListener("dirami-install-available", refresh);
    window.addEventListener("dirami-app-installed", refresh);
    return () => {
      window.removeEventListener("dirami-install-available", refresh);
      window.removeEventListener("dirami-app-installed", refresh);
    };
  }, []);

  async function install() {
    if (installed) return;
    if (!prompt) {
      setHelpOpen(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    window.__diramiInstallPrompt = null;
    setPrompt(null);
    if (choice.outcome === "accepted") {
      rememberDiramiInstalled();
      setInstalled(true);
      window.dispatchEvent(new Event("dirami-app-installed"));
    }
  }

  return (
    <>
      <MenuShell
        hint={
          installed
            ? "Dirami уже работает как приложение"
            : prompt
              ? "Установить на главный экран"
              : "Инструкция для этого устройства"
        }
        icon={<InstallIcon />}
        onClick={() => void install()}
        title={installed ? "Приложение установлено" : "Добавить приложение"}
      />

      {helpOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-3 sm:items-center"
          onClick={() => setHelpOpen(false)}
        >
          <section
            className="w-full max-w-sm rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.13em] text-accent-soft uppercase">
                  Приложение Dirami
                </p>
                <h3 className="mt-1 text-lg font-black">
                  Добавить на устройство
                </h3>
              </div>
              <button
                aria-label="Закрыть инструкцию"
                className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl"
                onClick={() => setHelpOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>
                <b>iPhone / iPad:</b> откройте меню «Поделиться» в Safari и
                выберите «На экран Домой».
              </p>
              <p>
                <b>Android / компьютер:</b> откройте меню браузера и выберите
                «Установить приложение» или «Добавить на главный экран».
              </p>
            </div>
            <button
              className="hover-accent mt-5 w-full rounded-full bg-accent py-3 text-sm font-black text-on-accent"
              onClick={() => setHelpOpen(false)}
              type="button"
            >
              Понятно
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

function applicationServerKey(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes.buffer;
}

export function PushNotificationsMenuItem() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [installed, setInstalled] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    const refreshInstalled = () => {
      if (!cancelled) setInstalled(isDiramiInstalled());
    };
    const timer = window.setTimeout(() => {
      refreshInstalled();
      const available =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (cancelled) return;
      setSupported(available);
      if (!available) return;

      void navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => {
          if (!cancelled) setEnabled(Boolean(subscription));
        })
        .catch(() => undefined);
    }, 0);

    window.addEventListener("dirami-install-available", refreshInstalled);
    window.addEventListener("dirami-app-installed", refreshInstalled);
    window.addEventListener("focus", refreshInstalled);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("dirami-install-available", refreshInstalled);
      window.removeEventListener("dirami-app-installed", refreshInstalled);
      window.removeEventListener("focus", refreshInstalled);
    };
  }, []);

  async function enable() {
    if (!isDiramiInstalled()) {
      setInstalled(false);
      setStatus("Сначала установите приложение Dirami");
      return;
    }
    setInstalled(true);

    if (Notification.permission === "denied") {
      setStatus("Разрешите уведомления в настройках браузера");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Без разрешения браузера push работать не будут");
      return;
    }

    const configResponse = await fetch("/api/push/subscription", {
      cache: "no-store",
    });
    const config = (await configResponse.json()) as {
      enabled?: boolean;
      publicKey?: string | null;
      error?: string;
    };
    if (!configResponse.ok || !config.enabled || !config.publicKey) {
      throw new Error(config.error || "Push недоступны на сервере");
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(config.publicKey),
      }));
    const json = subscription.toJSON();
    const response = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: json.keys,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      if (!existing) await subscription.unsubscribe();
      throw new Error(data.error || "Не удалось включить уведомления");
    }

    setEnabled(true);
    setStatus("Push-уведомления включены");
  }

  async function disable() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const response = await fetch("/api/push/subscription", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Не удалось отключить уведомления");
      }
      await subscription.unsubscribe();
    }
    setEnabled(false);
    setStatus("Push-уведомления отключены");
  }

  async function toggle() {
    if (!supported || busy || (!enabled && !installed)) return;
    setBusy(true);
    setStatus("");
    try {
      if (enabled) await disable();
      else await enable();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Не удалось изменить push",
      );
    } finally {
      setBusy(false);
    }
  }

  const hint =
    status ||
    (supported === false
      ? "Не поддерживаются этим браузером"
      : !installed && !enabled
        ? "Сначала установите приложение Dirami"
        : enabled
          ? "Нажмите, чтобы отключить"
          : "Сообщения и новости при закрытом Dirami");

  return (
    <MenuShell
      disabled={supported !== true || busy || (!installed && !enabled)}
      hint={busy ? "Подождите…" : hint}
      icon={<BellIcon active={enabled} />}
      onClick={() => void toggle()}
      title={enabled ? "Push включены" : "Включить уведомления"}
    />
  );
}
