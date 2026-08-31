"use client";

import { useState } from "react";
import { AdminNewsPublisher } from "@/components/admin-news-publisher";
import { AdminNftManager } from "@/components/admin-nft-manager";
import { AdminUserLimits } from "@/components/admin-user-limits";
import { BackupPasswordSettings } from "@/components/backup-password-settings";
import { GoogleAccountSettings } from "@/components/google-account-settings";
import { VerifiedName } from "@/components/verified-name";
import { applyTheme, readTheme, THEMES, type ThemeId } from "@/lib/theme";
import type { HyperVerificationAppearance } from "@/lib/types";

type Props = {
  nickname: string;
  isAdmin: boolean;
  isVerified: boolean;
  isHyperVerified: boolean;
  hyperAppearance?: Partial<HyperVerificationAppearance>;
  onClose: () => void;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-2)]">
      {children}
    </p>
  );
}

export function SettingsPanel({
  nickname,
  isAdmin,
  isVerified,
  isHyperVerified,
  hyperAppearance,
  onClose,
}: Props) {
  const [theme, setTheme] = useState<ThemeId>(readTheme);
  const [nftName, setNftName] = useState("");
  const [nftQty, setNftQty] = useState("1");
  const [nftValue, setNftValue] = useState("");
  const [nftImage, setNftImage] = useState("");
  const [nftMsg, setNftMsg] = useState("");
  const activeTheme = THEMES.find((item) => item.id === theme);

  function pickTheme(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
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
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/85 px-4 py-3 backdrop-blur-xl">
          <button
            aria-label="Закрыть настройки"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] active:scale-95"
            onClick={onClose}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="15"
              viewBox="0 0 16 16"
              width="15"
            >
              <path
                d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold leading-tight">
              Настройки
            </p>
            <p className="truncate text-[11px] leading-tight text-[var(--muted-2)]">
              <VerifiedName
                hyperAppearance={hyperAppearance}
                isHyperVerified={isHyperVerified}
                isVerified={isVerified}
                name={nickname}
              />
              {isAdmin ? " · админ" : ""}
            </p>
          </div>
        </header>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <section>
            <SectionLabel>Оформление</SectionLabel>
            <div className="settings-card p-3">
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {THEMES.map((item) => {
                  const active = item.id === theme;
                  return (
                    <button
                      className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition hover:bg-white/5"
                      key={item.id}
                      onClick={() => pickTheme(item.id)}
                      type="button"
                    >
                      <span
                        className={`relative grid size-11 place-items-center overflow-hidden rounded-full transition ${
                          active
                            ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
                            : "ring-1 ring-[var(--border)]"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${item.swatch[0]} 0%, ${item.swatch[0]} 52%, ${item.swatch[1]} 52%, ${item.swatch[1]} 100%)`,
                        }}
                      >
                        {active ? (
                          <svg
                            aria-hidden="true"
                            className="size-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                            fill="none"
                            viewBox="0 0 20 20"
                          >
                            <path
                              d="M4.5 10.5 8.4 14 15.5 6"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.4"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <span
                        className={`text-[11px] font-semibold leading-none ${
                          active
                            ? "text-[var(--text)]"
                            : "text-[var(--muted-2)]"
                        }`}
                      >
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-[10px] leading-4 text-[var(--muted-2)]">
                {activeTheme
                  ? `${activeTheme.name} — ${activeTheme.hint}`
                  : ""}
              </p>
            </div>
          </section>

          <GoogleAccountSettings />

          <BackupPasswordSettings />

          {isAdmin ? (
            <section>
              <SectionLabel>Админ-панель</SectionLabel>
              <div className="settings-card p-4">
                <p className="text-sm font-bold">Выпуск NFT</p>
                <p className="mb-3 text-[11px] text-[var(--muted-2)]">
                  Только администратор Dirami
                </p>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 px-3.5 py-2.5 text-sm transition focus:border-[var(--accent)]/60"
                    onChange={(event) => setNftName(event.target.value)}
                    placeholder="Название"
                    value={nftName}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 px-3.5 py-2.5 text-sm transition focus:border-[var(--accent)]/60"
                      min={1}
                      max={50}
                      onChange={(event) => setNftQty(event.target.value)}
                      placeholder="Кол-во"
                      type="number"
                      value={nftQty}
                    />
                    <input
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 px-3.5 py-2.5 text-sm transition focus:border-[var(--accent)]/60"
                      min={1}
                      onChange={(event) => setNftValue(event.target.value)}
                      placeholder="Ценность, ₽"
                      type="number"
                      value={nftValue}
                    />
                  </div>
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)]/70 px-3.5 py-2.5 text-sm transition focus:border-[var(--accent)]/60"
                    onChange={(event) => setNftImage(event.target.value)}
                    placeholder="Ссылка на картинку"
                    value={nftImage}
                  />
                </div>
                <button
                  className="hover-accent mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent shadow-[0_10px_24px_-12px_var(--accent)] transition disabled:opacity-50"
                  onClick={() => void mintNft()}
                  type="button"
                >
                  Выпустить
                </button>
                {nftMsg ? (
                  <p className="mt-2 text-xs text-[var(--muted-2)]">{nftMsg}</p>
                ) : null}
              </div>
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
