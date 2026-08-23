"use client";

import { useState } from "react";
import { AdminNewsPublisher } from "@/components/admin-news-publisher";
import { AdminNftManager } from "@/components/admin-nft-manager";
import { AdminUserLimits } from "@/components/admin-user-limits";
import { GoogleAccountSettings } from "@/components/google-account-settings";
import { VerifiedName } from "@/components/verified-name";
import { applyTheme, readTheme, THEMES, type ThemeId } from "@/lib/theme";

type Props = {
  nickname: string;
  isAdmin: boolean;
  isVerified: boolean;
  onClose: () => void;
};

export function SettingsPanel({
  nickname,
  isAdmin,
  isVerified,
  onClose,
}: Props) {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [nftName, setNftName] = useState("");
  const [nftQty, setNftQty] = useState("1");
  const [nftValue, setNftValue] = useState("");
  const [nftImage, setNftImage] = useState("");
  const [nftMsg, setNftMsg] = useState("");

  function pickTheme(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
  }

  async function changePassword() {
    setPasswordMsg("");
    if (newPassword.length < 8) {
      setPasswordMsg("Новый пароль: минимум 8 символов");
      return;
    }
    if (newPassword !== repeatPassword) {
      setPasswordMsg("Новые пароли не совпадают");
      return;
    }
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPasswordMsg(data.error ?? "Не получилось");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setPasswordMsg("Пароль обновлён");
    } catch {
      setPasswordMsg("Сеть недоступна");
    }
  }

  async function mintNft() {
    setNftMsg("");
    try {
      const response = await fetch("/api/nft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nftName,
          quantity: Number(nftQty),
          valueRub: Number(nftValue),
          imageUrl: nftImage,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        created?: number;
      };
      if (!response.ok) {
        setNftMsg(data.error ?? "Не выпустилось");
        return;
      }
      setNftName("");
      setNftQty("1");
      setNftValue("");
      setNftImage("");
      setNftMsg(`Выпущено: ${data.created}`);
      window.dispatchEvent(new Event("dirami-nfts-changed"));
    } catch {
      setNftMsg("Сеть недоступна");
    }
  }

  return (
    <div
      className="overlay-in absolute inset-0 z-20 flex bg-black/60 p-0 sm:p-3"
      onClick={onClose}
    >
      <section
        className="sheet-in ml-auto flex h-full w-full max-w-lg flex-col overflow-hidden border-[var(--border)] bg-[var(--bg)] shadow-2xl sm:rounded-[1.6rem] sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-md">
          <button
            className="grid size-9 place-items-center rounded-full hover:bg-white/8"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
          <div>
            <p className="text-[17px] font-bold">Настройки</p>
            <p className="text-xs text-[var(--muted-2)]">
              <VerifiedName isVerified={isVerified} name={nickname} />
              {isAdmin ? " · админ" : ""}
            </p>
          </div>
        </header>

        <div className="scrollbar-thin flex-1 space-y-8 overflow-y-auto px-4 py-6">
          <section>
            <p className="mb-3 text-[13px] font-semibold tracking-wide text-[var(--muted-2)] uppercase">
              Оформление
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((item) => {
                const active = item.id === theme;
                return (
                  <button
                    key={item.id}
                    className={`rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-[var(--accent)] bg-accent-muted"
                        : "border-[var(--border)] hover:bg-white/5"
                    }`}
                    onClick={() => pickTheme(item.id)}
                    type="button"
                  >
                    <span className="mb-2 flex overflow-hidden rounded-lg">
                      {item.swatch.map((color) => (
                        <span
                          key={color}
                          className="h-8 flex-1"
                          style={{ background: color }}
                        />
                      ))}
                    </span>
                    <span className="block text-sm font-semibold">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[var(--muted-2)]">
                      {item.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <GoogleAccountSettings />

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="mb-1 text-[13px] font-semibold">Пароль</p>
            <p className="mb-3 text-[11px] leading-4 text-[var(--muted-2)]">
              Если аккаунт создан через Google и пароля ещё нет, оставьте поле
              текущего пароля пустым.
            </p>
            <div className="space-y-2">
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                maxLength={72}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Текущий пароль"
                type="password"
                value={currentPassword}
              />
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                maxLength={72}
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Новый пароль · минимум 8 символов"
                type="password"
                value={newPassword}
              />
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                maxLength={72}
                minLength={8}
                onChange={(event) => setRepeatPassword(event.target.value)}
                placeholder="Повтори новый пароль"
                type="password"
                value={repeatPassword}
              />
            </div>
            <button
              className="mt-3 w-full rounded-full border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-white/5"
              onClick={() => void changePassword()}
              type="button"
            >
              Сменить пароль
            </button>
            {passwordMsg ? (
              <p className="mt-2 text-xs text-[var(--muted-2)]">
                {passwordMsg}
              </p>
            ) : null}
          </section>

          {isAdmin ? (
            <section className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--panel)] p-4">
              <p className="mb-1 text-[13px] font-semibold">Выпуск NFT</p>
              <p className="mb-3 text-[11px] text-[var(--muted-2)]">
                Только администратор Dirami
              </p>
              <div className="space-y-2">
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                  onChange={(event) => setNftName(event.target.value)}
                  placeholder="Название"
                  value={nftName}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    min={1}
                    max={50}
                    onChange={(event) => setNftQty(event.target.value)}
                    placeholder="Кол-во"
                    type="number"
                    value={nftQty}
                  />
                  <input
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    min={1}
                    onChange={(event) => setNftValue(event.target.value)}
                    placeholder="Ценность, ₽"
                    type="number"
                    value={nftValue}
                  />
                </div>
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                  onChange={(event) => setNftImage(event.target.value)}
                  placeholder="Ссылка на картинку"
                  value={nftImage}
                />
              </div>
              <button
                className="hover-accent mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent"
                onClick={() => void mintNft()}
                type="button"
              >
                Выпустить
              </button>
              {nftMsg ? (
                <p className="mt-2 text-xs text-[var(--muted-2)]">{nftMsg}</p>
              ) : null}
            </section>
          ) : null}

          {isAdmin ? <AdminNftManager /> : null}
          {isAdmin ? <AdminNewsPublisher /> : null}
          {isAdmin ? <AdminUserLimits /> : null}
        </div>
      </section>
    </div>
  );
}
