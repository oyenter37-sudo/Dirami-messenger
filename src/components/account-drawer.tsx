"use client";

import { useEffect, useState } from "react";
import {
  InstallAppMenuItem,
  PushNotificationsMenuItem,
} from "@/components/pwa-menu-controls";
import { RichText } from "@/components/rich-text";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedName } from "@/components/verified-name";
import type { HyperVerificationAppearance } from "@/lib/types";

type Props = {
  nickname: string;
  displayName?: string;
  isVerified?: boolean;
  isHyperVerified?: boolean;
  hyperAppearance?: Partial<HyperVerificationAppearance>;
  onClose: () => void;
  newsUnread: number;
  onOpenNews: () => void;
  onOpenSettings: () => void;
  onOpenLimits: () => void;
  onLogout: () => Promise<void>;
};

type IconName = "news" | "settings" | "limits" | "logout";

function MenuIcon({ name }: { name: IconName }) {
  if (name === "news") {
    return (
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 4.5h11.2A1.8 1.8 0 0 1 19 6.3v12.2H6.8A1.8 1.8 0 0 1 5 16.7V5.5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="M8.5 8h7M8.5 11h7M8.5 14h4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
        <path
          d="M19 16h-1.2a1.8 1.8 0 0 0-1.8 1.8v.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.4 13.2a7.7 7.7 0 0 0 0-2.4l2-1.5-2-3.4-2.4 1a8.8 8.8 0 0 0-2-1.2L14.7 3h-4l-.4 2.7a8.8 8.8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8.8 8.8 0 0 0 2 1.2l.4 2.7h4l.4-2.7a8.8 8.8 0 0 0 2-1.2l2.4 1 2-3.4-2.1-1.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (name === "limits") {
    return (
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M5 18a8 8 0 1 1 14 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <path
          d="m12 13 3.6-3.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="13"
          r="1.8"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M7 18h10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M10 5H5.8A1.8 1.8 0 0 0 4 6.8v10.4A1.8 1.8 0 0 0 5.8 19H10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M14.5 8.5 18 12l-3.5 3.5M9 12h9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function AccountDrawer({
  nickname,
  displayName,
  isVerified,
  isHyperVerified,
  hyperAppearance,
  newsUnread,
  onClose,
  onOpenNews,
  onOpenSettings,
  onOpenLimits,
  onLogout,
}: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutGoogleLinked, setLogoutGoogleLinked] = useState<boolean | null>(
    null,
  );
  const [logoutChecking, setLogoutChecking] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentDisplayName, setCurrentDisplayName] = useState(
    displayName || nickname,
  );
  const [currentVerified, setCurrentVerified] = useState(Boolean(isVerified));
  const [currentHyperVerified, setCurrentHyperVerified] = useState(
    Boolean(isHyperVerified),
  );
  const [currentHyperAppearance, setCurrentHyperAppearance] = useState<
    Partial<HyperVerificationAppearance>
  >(hyperAppearance ?? {});

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (data: {
          user?: {
            avatarUrl?: string;
            displayName?: string;
            isVerified?: boolean;
            isHyperVerified?: boolean;
            hyperBadgeStyle?: string;
            hyperBadgeColor?: string;
            hyperNameStyle?: string;
            hyperNameColor?: string;
            hyperNameGlow?: string;
          };
        }) => {
          if (!cancelled) {
            setAvatarUrl(data.user?.avatarUrl ?? "");
            setCurrentDisplayName(
              data.user?.displayName || displayName || nickname,
            );
            setCurrentVerified(Boolean(data.user?.isVerified ?? isVerified));
            setCurrentHyperVerified(
              Boolean(data.user?.isHyperVerified ?? isHyperVerified),
            );
            setCurrentHyperAppearance({
              hyperBadgeStyle:
                data.user?.hyperBadgeStyle ?? hyperAppearance?.hyperBadgeStyle,
              hyperBadgeColor:
                data.user?.hyperBadgeColor ?? hyperAppearance?.hyperBadgeColor,
              hyperNameStyle:
                data.user?.hyperNameStyle ?? hyperAppearance?.hyperNameStyle,
              hyperNameColor:
                data.user?.hyperNameColor ?? hyperAppearance?.hyperNameColor,
              hyperNameGlow:
                data.user?.hyperNameGlow ?? hyperAppearance?.hyperNameGlow,
            });
          }
        },
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [displayName, hyperAppearance, isHyperVerified, isVerified, nickname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmLogout) setConfirmLogout(false);
      else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmLogout, onClose]);

  async function openLogoutConfirmation() {
    setConfirmLogout(true);
    setLogoutChecking(true);
    setLogoutGoogleLinked(null);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/google/status", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        linked?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setLogoutError(data.error ?? "Не удалось проверить Google-аккаунт");
        return;
      }
      setLogoutGoogleLinked(Boolean(data.linked));
    } catch {
      setLogoutError("Не удалось проверить Google-аккаунт");
    } finally {
      setLogoutChecking(false);
    }
  }

  async function confirm() {
    if (loggingOut || !logoutGoogleLinked) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await onLogout();
    } catch {
      setLogoutError("Не удалось выйти. Попробуйте ещё раз.");
      setLoggingOut(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65"
      onClick={onClose}
    >
      <aside
        aria-label="Меню аккаунта"
        className="account-drawer-in relative flex h-full w-[min(88vw,380px)] flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-[-24px_0_70px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-sm font-black text-on-accent shadow-[0_10px_28px_-14px_var(--accent)]">
              D
            </span>
            <div>
              <p className="text-[17px] font-extrabold">
                <RichText text="Dirami" />
              </p>
              <p className="text-[11px] text-[var(--muted-2)]">Меню аккаунта</p>
            </div>
          </div>
          <button
            aria-label="Закрыть меню"
            className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-3.5">
            <UserAvatar
              avatarUrl={avatarUrl}
              className="size-12 rounded-full text-sm"
              nickname={currentDisplayName}
            />
            <div className="min-w-0">
              <p className="min-w-0 text-sm font-extrabold">
                <VerifiedName
                  hyperAppearance={currentHyperAppearance}
                  isHyperVerified={currentHyperVerified}
                  isVerified={currentVerified}
                  name={currentDisplayName}
                  truncate
                />
              </p>
              <p className="truncate text-xs text-[var(--muted-2)]">
                @{nickname}
              </p>
            </div>
          </div>

          <p className="mt-7 mb-2 px-2 text-[10px] font-bold tracking-[0.13em] text-[var(--muted-2)] uppercase">
            Аккаунт
          </p>
          <div className="space-y-1.5">
            <button
              className="group flex w-full items-center gap-3 rounded-[1.25rem] border border-transparent px-3 py-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--panel)]"
              onClick={onOpenNews}
              type="button"
            >
              <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-muted text-accent-soft">
                <MenuIcon name="news" />
                {newsUnread > 0 ? (
                  <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white shadow-lg">
                    {Math.min(newsUnread, 50)}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Новости</span>
                <span className="block text-[11px] text-[var(--muted-2)]">
                  Последние обновления Dirami
                </span>
              </span>
              {newsUnread > 0 ? (
                <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-black text-red-300">
                  {newsUnread} непрочит.
                </span>
              ) : (
                <span className="text-lg text-[var(--muted-2)] transition group-hover:translate-x-0.5">
                  ›
                </span>
              )}
            </button>

            <button
              className="group flex w-full items-center gap-3 rounded-[1.25rem] border border-transparent px-3 py-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--panel)]"
              onClick={onOpenSettings}
              type="button"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-muted text-accent-soft">
                <MenuIcon name="settings" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Настройки</span>
                <span className="block text-[11px] text-[var(--muted-2)]">
                  Google, резервный пароль и темы
                </span>
              </span>
              <span className="text-lg text-[var(--muted-2)] transition group-hover:translate-x-0.5">
                ›
              </span>
            </button>

            <button
              className="group flex w-full items-center gap-3 rounded-[1.25rem] border border-transparent px-3 py-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--panel)]"
              onClick={onOpenLimits}
              type="button"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-muted text-accent-soft">
                <MenuIcon name="limits" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Dirami Limits</span>
                <span className="block text-[11px] text-[var(--muted-2)]">
                  Ваши лимиты и защита от спама
                </span>
              </span>
              <span className="text-lg text-[var(--muted-2)] transition group-hover:translate-x-0.5">
                ›
              </span>
            </button>
          </div>

          <p className="mt-7 mb-2 px-2 text-[10px] font-bold tracking-[0.13em] text-[var(--muted-2)] uppercase">
            Приложение
          </p>
          <div className="space-y-1.5">
            <InstallAppMenuItem />
            <PushNotificationsMenuItem />
          </div>
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <button
            className="flex w-full items-center gap-3 rounded-[1.25rem] bg-red-500/10 px-3 py-3 text-left text-red-300 transition hover:bg-red-500/15"
            onClick={() => void openLogoutConfirmation()}
            type="button"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-red-500/10">
              <MenuIcon name="logout" />
            </span>
            <span>
              <span className="block text-sm font-bold">Выйти</span>
              <span className="block text-[11px] text-red-300/60">
                Завершить текущий сеанс
              </span>
            </span>
          </button>
        </div>

        {confirmLogout ? (
          <div className="absolute inset-0 z-10 flex items-end bg-black/80 p-4 backdrop-blur-sm sm:items-center">
            <div className="relative w-full overflow-hidden rounded-[1.9rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl">
              <div className="pointer-events-none absolute -top-16 -right-12 size-36 rounded-full bg-red-500/12 blur-3xl" />

              {logoutChecking ? (
                <div className="relative py-5 text-center">
                  <span className="mx-auto block size-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  <p className="mt-3 text-sm font-semibold">
                    Проверяем способ входа…
                  </p>
                </div>
              ) : logoutGoogleLinked === false ? (
                <div className="relative">
                  <span className="grid size-12 place-items-center rounded-2xl bg-amber-400/10 text-xl text-amber-200">
                    G
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold">
                    Сначала подключите Google
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--muted-2)]">
                    Вход по юзу и паролю отключён. Без привязанного Google вы не
                    сможете вернуться в этот профиль после выхода.
                  </p>
                  {logoutError ? (
                    <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {logoutError}
                    </p>
                  ) : null}
                  <div className="mt-5 flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm font-bold hover:bg-white/5"
                      onClick={() => setConfirmLogout(false)}
                      type="button"
                    >
                      Остаться
                    </button>
                    <button
                      className="hover-accent flex-1 rounded-full bg-accent py-2.5 text-sm font-bold text-on-accent"
                      onClick={() => {
                        setConfirmLogout(false);
                        onOpenSettings();
                      }}
                      type="button"
                    >
                      Открыть настройки
                    </button>
                  </div>
                </div>
              ) : logoutGoogleLinked ? (
                <div className="relative">
                  <span className="grid size-12 place-items-center rounded-2xl bg-red-500/10 text-red-300">
                    <MenuIcon name="logout" />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold">
                    Завершить сеанс?
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--muted-2)]">
                    Dirami закроется на этом устройстве и отключит локальные
                    push-уведомления. Вернуться можно через подключённый Google.
                  </p>
                  {logoutError ? (
                    <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {logoutError}
                    </p>
                  ) : null}
                  <div className="mt-5 flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm font-bold hover:bg-white/5"
                      disabled={loggingOut}
                      onClick={() => setConfirmLogout(false)}
                      type="button"
                    >
                      Остаться
                    </button>
                    <button
                      className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                      disabled={loggingOut}
                      onClick={() => void confirm()}
                      type="button"
                    >
                      {loggingOut ? "Завершаем…" : "Выйти"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <h3 className="text-lg font-extrabold">
                    Не удалось проверить Google
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--muted-2)]">
                    Для безопасности выход временно недоступен. Проверьте сеть и
                    попробуйте ещё раз.
                  </p>
                  {logoutError ? (
                    <p className="mt-3 text-xs text-red-300">{logoutError}</p>
                  ) : null}
                  <div className="mt-5 flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm font-bold hover:bg-white/5"
                      onClick={() => setConfirmLogout(false)}
                      type="button"
                    >
                      Закрыть
                    </button>
                    <button
                      className="flex-1 rounded-full bg-accent py-2.5 text-sm font-bold text-on-accent"
                      onClick={() => void openLogoutConfirmation()}
                      type="button"
                    >
                      Повторить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
