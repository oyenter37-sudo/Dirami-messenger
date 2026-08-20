"use client";

import { useEffect, useState } from "react";
import { applyTheme, readTheme, THEMES, type ThemeId } from "@/lib/theme";

type Props = {
  nickname: string;
  onClose: () => void;
};

export function SettingsPanel({ nickname, onClose }: Props) {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [bio, setBio] = useState("");
  const [savedBio, setSavedBio] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: { bio?: string } }) => {
        if (cancelled || typeof data.user?.bio !== "string") return;
        setBio(data.user.bio);
        setSavedBio(data.user.bio);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function pickTheme(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
  }

  async function saveBio() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const data = (await response.json()) as { error?: string; user?: { bio: string } };
      if (!response.ok) {
        setMessage(data.error ?? "Не сохранилось");
        return;
      }
      setSavedBio(data.user?.bio ?? bio);
      setMessage("Описание сохранено");
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="overlay-in absolute inset-0 z-20 flex bg-black/55 p-3 backdrop-blur-md" onClick={onClose}>
      <section
        className="sheet-in glass ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Настройки</p>
            <p className="text-xs text-[var(--muted-2)]">{nickname}</p>
          </div>
          <button
            className="rounded-xl px-2 py-1 text-sm text-[var(--muted-2)] hover:bg-white/5"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </header>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h2 className="mb-3 text-sm font-medium">Тема</h2>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((item) => {
                const active = item.id === theme;
                return (
                  <button
                    key={item.id}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-[var(--accent)] bg-accent-muted"
                        : "border-[var(--border)] hover:bg-white/5"
                    }`}
                    onClick={() => pickTheme(item.id)}
                    type="button"
                  >
                    <span className="mb-2 flex gap-1">
                      {item.swatch.map((color) => (
                        <span
                          key={color}
                          className="size-4 rounded-full"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    <span className="block text-sm font-medium">{item.name}</span>
                    <span className="text-[11px] text-[var(--muted-2)]">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium">Профиль</h2>
            <label className="block">
              <span className="mb-1.5 block text-xs text-[var(--muted-2)]">Описание</span>
              <textarea
                className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                maxLength={280}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Коротко о себе"
                value={bio}
              />
            </label>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--muted-2)]">{bio.length}/280</span>
              <button
                className="hover-accent rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-50"
                disabled={pending || bio === savedBio}
                onClick={() => void saveBio()}
                type="button"
              >
                Сохранить
              </button>
            </div>
            {message ? (
              <p className="mt-2 text-xs text-[var(--muted-2)]">{message}</p>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}
