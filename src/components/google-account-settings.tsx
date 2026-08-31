"use client";

import { useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type GoogleStatus = {
  linked: boolean;
  googleProfile: {
    email: string;
    name: string;
    pictureUrl: string;
  } | null;
};

export function GoogleAccountSettings() {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/google/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as GoogleStatus;
        if (!cancelled) setStatus(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function linkGoogle(credential: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "link_session", credential }),
      });
      const data = (await response.json()) as {
        error?: string;
        googleProfile?: GoogleStatus["googleProfile"];
      };
      if (!response.ok || !data.googleProfile) {
        setMessage(data.error ?? "Не удалось подключить Google");
        return;
      }
      setStatus({
        linked: true,
        googleProfile: data.googleProfile ?? null,
      });
      setMessage("Google подключён. Весь прогресс остался в этом профиле");
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="settings-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-lg font-bold text-[#4285f4] shadow-sm">
          G
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Google-аккаунт</p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--muted-2)]">
            Входите через Google без создания нового профиля Dirami.
          </p>
        </div>
      </div>

      {status?.linked ? (
        <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-emerald-200">Подключён</p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted-2)]">
            {status.googleProfile?.email}
          </p>
          <p className="mt-2 text-[11px] leading-4 text-[var(--muted-2)]">
            Чаты, NFT, профиль, галочка и лимиты привязаны к тому же профилю
            Dirami.
          </p>
        </div>
      ) : status ? (
        <div className="mt-4">
          <GoogleSignInButton
            disabled={pending}
            onCredential={(credential) => void linkGoogle(credential)}
          />
          <p className="mt-2 text-center text-[10px] leading-4 text-[var(--muted-2)]">
            Google будет привязан к текущему профилю — прогресс не переносится в
            новый аккаунт и не теряется.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted-2)]">Проверяем связь…</p>
      )}

      {message ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-xs ${
            status?.linked
              ? "bg-emerald-400/8 text-emerald-200"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
