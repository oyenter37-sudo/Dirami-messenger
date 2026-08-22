"use client";

import { type CSSProperties, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import {
  PROFILE_ACCENTS,
  PROFILE_BACKGROUNDS,
  normalizeProfileAccent,
  normalizeProfileBackground,
  profileBackgroundCss,
} from "@/lib/profile-customization";
import type { PublicUser } from "@/lib/types";

type Props = {
  user: PublicUser;
  onClose: () => void;
  onSaved: (user: PublicUser) => void;
};

export function ProfileEditor({ user, onClose, onSaved }: Props) {
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [accent, setAccent] = useState(normalizeProfileAccent(user.profileAccent));
  const [background, setBackground] = useState(
    normalizeProfileBackground(user.profileBackground),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bio,
          avatarUrl,
          profileAccent: accent,
          profileBackground: background,
        }),
      });
      const data = (await response.json()) as { error?: string; user?: PublicUser };
      if (!response.ok || !data.user) {
        setError(data.error ?? "Не удалось сохранить профиль");
        return;
      }
      onSaved(data.user);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }

  const previewStyle = {
    "--profile-accent": accent,
    background: profileBackgroundCss(background, accent),
  } as CSSProperties;

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-black/75" onClick={onClose}>
      <section
        aria-label="Настройка профиля"
        className="sheet-in flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-[-25px_0_80px_rgba(0,0,0,.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.13em] text-[var(--muted-2)] uppercase">
              Бесплатная кастомизация
            </p>
            <h2 className="text-lg font-extrabold">Оформление профиля</h2>
          </div>
          <button
            aria-label="Закрыть редактор"
            className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl text-[var(--muted)] hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div
            className="relative h-44 overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_22px_50px_-28px_rgba(0,0,0,.9)]"
            style={previewStyle}
          >
            <div className="profile-cover-grid absolute inset-0 opacity-45" />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/75 to-transparent p-4 pt-14">
              <UserAvatar
                avatarUrl={avatarUrl}
                className="size-16 rounded-[1.25rem] border-[3px] border-white/80 text-lg shadow-xl"
                nickname={user.nickname}
              />
              <div className="min-w-0 pb-1 text-white">
                <p className="truncate text-lg font-extrabold">{user.nickname}</p>
                <p className="truncate text-xs text-white/65">@{user.nickname}</p>
              </div>
            </div>
          </div>

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold" htmlFor="profile-avatar">
                Аватар
              </label>
              {avatarUrl ? (
                <button
                  className="text-[11px] font-semibold text-red-300 hover:text-red-200"
                  onClick={() => setAvatarUrl("")}
                  type="button"
                >
                  Удалить фото
                </button>
              ) : null}
            </div>
            <input
              autoComplete="url"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3 text-sm placeholder:text-[var(--muted-2)]"
              id="profile-avatar"
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.jpg"
              type="url"
              value={avatarUrl}
            />
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--muted-2)]">
              Вставьте прямую ссылку на изображение. Аватар увидят все пользователи.
            </p>
          </section>

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold" htmlFor="profile-bio">
                Описание
              </label>
              <span className="text-[10px] text-[var(--muted-2)]">{bio.length}/280</span>
            </div>
            <textarea
              className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3 text-sm leading-6 placeholder:text-[var(--muted-2)]"
              id="profile-bio"
              maxLength={280}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Расскажите немного о себе"
              value={bio}
            />
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Цвет профиля</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">Кнопки, метки и подсветка</p>
              </div>
              <label
                className="relative grid size-10 cursor-pointer place-items-center overflow-hidden rounded-full border-[3px] border-white/15 shadow-lg"
                style={{ background: accent }}
                title="Выбрать любой цвет"
              >
                <input
                  aria-label="Произвольный цвет профиля"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(event) => setAccent(event.target.value)}
                  type="color"
                  value={accent}
                />
                <span className="text-sm font-black text-white drop-shadow">+</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {PROFILE_ACCENTS.map((color) => (
                <button
                  aria-label={`Цвет ${color}`}
                  className={`size-9 rounded-full border-[3px] transition hover:scale-110 ${
                    accent === color ? "border-white shadow-lg" : "border-transparent"
                  }`}
                  key={color}
                  onClick={() => setAccent(color)}
                  style={{ background: color }}
                  type="button"
                />
              ))}
            </div>
          </section>

          <section className="mt-7 pb-3">
            <div className="mb-3">
              <p className="text-sm font-bold">Фон профиля</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                Фон будет виден всем, кто откроет профиль
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {PROFILE_BACKGROUNDS.map((item) => {
                const active = background === item.id;
                return (
                  <button
                    className={`overflow-hidden rounded-2xl border p-1.5 text-left transition ${
                      active
                        ? "border-white/45 bg-white/8"
                        : "border-[var(--border)] hover:border-white/20"
                    }`}
                    key={item.id}
                    onClick={() => setBackground(item.id)}
                    type="button"
                  >
                    <span
                      className="block h-20 rounded-xl"
                      style={{ background: profileBackgroundCss(item.id, accent) }}
                    />
                    <span className="block px-1.5 pt-2 pb-1 text-xs font-bold">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] p-4">
          {error ? <p className="mb-2 text-xs text-red-300">{error}</p> : null}
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-full border border-[var(--border)] py-3 text-sm font-bold hover:bg-white/5"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Отмена
            </button>
            <button
              className="profile-accent-button flex-[1.4] rounded-full py-3 text-sm font-extrabold text-white shadow-lg disabled:opacity-50"
              disabled={saving}
              onClick={() => void save()}
              style={{ background: accent }}
              type="button"
            >
              {saving ? "Сохраняем…" : "Сохранить профиль"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
