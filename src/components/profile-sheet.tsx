"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { ProfileEditor } from "@/components/profile-editor";
import { RichText } from "@/components/rich-text";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedName } from "@/components/verified-name";
import {
  normalizeProfileAccent,
  normalizeProfileBackground,
  profileBackgroundCss,
} from "@/lib/profile-customization";
import type { NftItem, PublicUser } from "@/lib/types";

type Props = {
  userId: string;
  meId: string;
  fallback?: Pick<
    PublicUser,
    | "nickname"
    | "displayName"
    | "isVerified"
    | "bio"
    | "avatarUrl"
    | "profileAccent"
    | "profileBackground"
  >;
  onClose: () => void;
};

type NftGroup = {
  key: string;
  name: string;
  imageUrl: string;
  minValueRub: number;
  maxValueRub: number;
  items: NftItem[];
};

function nftGroupKey(nft: NftItem) {
  return JSON.stringify([nft.name, nft.imageUrl]);
}

export function ProfileSheet({ userId, meId, fallback, onClose }: Props) {
  const [user, setUser] = useState<PublicUser | null>(
    fallback
      ? {
          id: userId,
          nickname: fallback.nickname,
          displayName: fallback.displayName,
          isVerified: fallback.isVerified,
          bio: fallback.bio,
          avatarUrl: fallback.avatarUrl,
          profileAccent: fallback.profileAccent,
          profileBackground: fallback.profileBackground,
          nfts: [],
        }
      : null,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<{
    nft: NftItem;
    to: string;
    step: 1 | 2;
  } | null>(null);
  const [transferError, setTransferError] = useState("");

  const mine = userId === meId;

  async function reload() {
    const response = await fetch(`/api/users/${userId}`, { cache: "no-store" });
    const data = (await response.json()) as { user?: PublicUser };
    if (data.user) setUser(data.user);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/users/${userId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: PublicUser }) => {
        if (!cancelled && data.user) setUser(data.user);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!detailsKey && !transfer && !editorOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (transfer) setTransfer(null);
      else if (detailsKey) setDetailsKey(null);
      else setEditorOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsKey, editorOpen, transfer]);

  const nickname = user?.nickname ?? fallback?.nickname ?? "…";
  const displayName = user?.displayName || fallback?.displayName || nickname;
  const isVerified = user?.isVerified ?? fallback?.isVerified ?? false;
  const bio = user?.bio ?? fallback?.bio ?? "";
  const avatarUrl = user?.avatarUrl ?? fallback?.avatarUrl ?? "";
  const accent = normalizeProfileAccent(
    user?.profileAccent ?? fallback?.profileAccent,
  );
  const background = normalizeProfileBackground(
    user?.profileBackground ?? fallback?.profileBackground,
  );
  const nfts = useMemo(() => user?.nfts ?? [], [user?.nfts]);
  const nftGroups = useMemo<NftGroup[]>(() => {
    const grouped = new Map<string, NftGroup>();
    for (const nft of nfts) {
      const key = nftGroupKey(nft);
      const existing = grouped.get(key);
      if (existing) {
        existing.items.push(nft);
        existing.minValueRub = Math.min(existing.minValueRub, nft.valueRub);
        existing.maxValueRub = Math.max(existing.maxValueRub, nft.valueRub);
      } else {
        grouped.set(key, {
          key,
          name: nft.name,
          imageUrl: nft.imageUrl,
          minValueRub: nft.valueRub,
          maxValueRub: nft.valueRub,
          items: [nft],
        });
      }
    }
    return [...grouped.values()];
  }, [nfts]);
  const detailsGroup =
    nftGroups.find((group) => group.key === detailsKey) ?? null;
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const profileStyle = {
    "--profile-accent": accent,
  } as CSSProperties;

  async function confirmTransfer() {
    if (!transfer || transfer.step !== 2) return;
    setTransferError("");
    try {
      const response = await fetch("/api/nft/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nftId: transfer.nft.id,
          toNickname: transfer.to,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setTransferError(data.error ?? "Не передалось");
        return;
      }
      setTransfer(null);
      setDetailsKey(null);
      await reload();
    } catch {
      setTransferError("Сеть недоступна");
    }
  }

  return (
    <div
      className="overlay-in fixed inset-0 z-30 flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="profile-shell profile-in relative flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden bg-[var(--bg)] shadow-[0_35px_110px_rgba(0,0,0,.68)] sm:rounded-[2rem] sm:border sm:border-[var(--border)]"
        onClick={(event) => event.stopPropagation()}
        style={profileStyle}
      >
        <button
          aria-label="Закрыть профиль"
          className="absolute top-3 left-3 z-30 grid size-11 place-items-center rounded-full border border-white/15 bg-black/45 text-[26px] text-white shadow-lg transition hover:scale-105 hover:bg-black/65"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        {mine && user ? (
          <button
            className="absolute top-3 right-3 z-30 flex h-11 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-xs font-bold text-white shadow-lg transition hover:scale-[1.02] hover:bg-black/65"
            onClick={() => setEditorOpen(true)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m4 16-.8 4.8L8 20l10.7-10.7a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 16Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="m13.8 7.4 2.8 2.8"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            Настроить
          </button>
        ) : null}

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div
            className="relative h-52 shrink-0 overflow-hidden sm:h-60"
            style={{ background: profileBackgroundCss(background, accent) }}
          >
            <div className="profile-cover-grid absolute inset-0 opacity-40" />
            <div className="absolute -top-20 -right-16 size-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--bg)] to-transparent" />
            <UserAvatar
              avatarUrl={avatarUrl}
              className="absolute bottom-0 left-5 size-28 translate-y-1/2 rounded-[2rem] border-[5px] border-[var(--bg)] text-3xl shadow-[0_18px_50px_-20px_rgba(0,0,0,.9)] sm:left-7 sm:size-32"
              nickname={displayName}
            />
          </div>

          <main className="px-5 pt-16 pb-9 sm:px-7 sm:pt-20">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-[27px] leading-8 font-black tracking-[-0.03em] sm:text-[30px]">
                  <VerifiedName
                    isVerified={isVerified}
                    name={displayName}
                    truncate
                  />
                </h1>
                <p className="mt-1 text-sm font-medium text-[var(--muted-2)]">
                  @{nickname}
                </p>
              </div>
              <span className="profile-accent-soft profile-accent-text mt-1 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-wide uppercase">
                Dirami profile
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {joined ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
                  В Dirami с {joined}
                </span>
              ) : null}
              <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
                Публичный профиль
              </span>
            </div>

            <section className="mt-6 rounded-[1.6rem] border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="profile-accent-bg h-4 w-1 rounded-full" />
                <h2 className="text-[11px] font-extrabold tracking-[0.12em] text-[var(--muted-2)] uppercase">
                  О себе
                </h2>
              </div>
              <p
                className={`text-[15px] leading-6 ${bio.trim() ? "" : "text-[var(--muted-2)]"}`}
              >
                {bio.trim() ? (
                  <RichText text={bio} />
                ) : (
                  "Пользователь пока ничего о себе не рассказал."
                )}
              </p>
            </section>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel)] px-4 py-3.5">
                <p className="text-[10px] font-bold tracking-wide text-[var(--muted-2)] uppercase">
                  NFT в коллекции
                </p>
                <p className="mt-1 text-2xl font-black">{nfts.length}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel)] px-4 py-3.5">
                <p className="text-[10px] font-bold tracking-wide text-[var(--muted-2)] uppercase">
                  Уникальных видов
                </p>
                <p className="mt-1 text-2xl font-black">{nftGroups.length}</p>
              </div>
            </div>

            <section className="mt-9">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--muted-2)] uppercase">
                    Цифровая коллекция
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {mine ? "Мои NFT" : "NFT"}
                  </h2>
                </div>
                <span className="profile-accent-soft profile-accent-text rounded-full px-3 py-1.5 text-[11px] font-extrabold">
                  {nfts.length} шт.
                </span>
              </div>

              {nfts.length === 0 ? (
                <div className="relative overflow-hidden rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--panel)] px-5 py-12 text-center">
                  <div className="profile-accent-soft profile-accent-text mx-auto grid size-14 place-items-center rounded-[1.25rem] text-2xl">
                    ◇
                  </div>
                  <p className="mt-4 text-sm font-extrabold">
                    Коллекция пока пуста
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--muted-2)]">
                    Когда здесь появятся NFT, их увидят все посетители профиля.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  {nftGroups.map((group) => {
                    const nft = group.items[0];
                    const multiple = group.items.length > 1;
                    const price =
                      group.maxValueRub === group.minValueRub
                        ? `${group.minValueRub.toLocaleString("ru-RU")} ₽`
                        : `${group.minValueRub.toLocaleString("ru-RU")}–${group.maxValueRub.toLocaleString("ru-RU")} ₽`;

                    return (
                      <article
                        key={group.key}
                        className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--panel)] p-1.5 shadow-[0_16px_36px_-26px_rgba(0,0,0,0.9)]"
                      >
                        <button
                          aria-label={
                            multiple ? `Открыть ${group.name}` : group.name
                          }
                          className={`relative block aspect-square w-full overflow-hidden rounded-[1.1rem] text-left ${
                            multiple ? "cursor-pointer" : "cursor-default"
                          }`}
                          onClick={() => multiple && setDetailsKey(group.key)}
                          type="button"
                        >
                          <img
                            alt={group.name}
                            className="h-full w-full object-cover transition duration-300 hover:scale-[1.025]"
                            src={group.imageUrl}
                          />
                          <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                          {multiple ? (
                            <span className="absolute top-2 left-2 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                              {group.items.length} шт.
                            </span>
                          ) : null}
                        </button>
                        <div className="px-2 pt-2.5 pb-1.5">
                          <p className="truncate text-[13px] font-bold leading-5">
                            {group.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-amber-200/90">
                            ≈ {price}
                          </p>
                        </div>
                        {multiple ? (
                          <button
                            className="profile-accent-soft profile-accent-text mt-1 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-[12px] font-extrabold transition hover:brightness-110"
                            onClick={() => setDetailsKey(group.key)}
                            type="button"
                          >
                            <span>Подробнее</span>
                            <span>→</span>
                          </button>
                        ) : mine ? (
                          <button
                            className="mt-1 w-full rounded-2xl px-3 py-2.5 text-center text-[12px] font-semibold text-[var(--muted)] hover:bg-white/5 hover:text-white"
                            onClick={() =>
                              setTransfer({ nft, to: "", step: 1 })
                            }
                            type="button"
                          >
                            Передать
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </div>

        {editorOpen && user ? (
          <ProfileEditor
            onClose={() => setEditorOpen(false)}
            onSaved={(updated) => {
              setUser(updated);
              setEditorOpen(false);
            }}
            user={user}
          />
        ) : null}

        {detailsGroup ? (
          <div
            className="absolute inset-0 z-40 flex items-end bg-black/75 sm:items-center sm:p-5"
            onClick={() => setDetailsKey(null)}
          >
            <section
              aria-label={`Экземпляры ${detailsGroup.name}`}
              className="nft-sheet-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-[var(--border)] bg-[var(--bg)] shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:max-h-[82vh] sm:rounded-[2rem]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-center pt-2.5 sm:hidden">
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted-2)] uppercase">
                    NFT-коллекция
                  </p>
                  <h3 className="truncate text-[17px] font-extrabold">
                    Все экземпляры
                  </h3>
                </div>
                <button
                  aria-label="Закрыть список NFT"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-[27px] leading-none text-white shadow-lg hover:bg-white/15"
                  onClick={() => setDetailsKey(null)}
                  type="button"
                >
                  ×
                </button>
              </header>
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="flex items-center gap-4 rounded-[1.6rem] border border-[var(--border)] bg-[var(--panel)] p-3">
                  <img
                    alt={detailsGroup.name}
                    className="size-24 shrink-0 rounded-[1.25rem] object-cover shadow-xl"
                    src={detailsGroup.imageUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-extrabold">
                      {detailsGroup.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-2)]">
                      Все одинаковые экземпляры
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="profile-accent-soft profile-accent-text rounded-full px-2.5 py-1 text-[11px] font-bold">
                        {detailsGroup.items.length} шт.
                      </span>
                      <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                        от {detailsGroup.minValueRub.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
                    <p className="text-[10px] font-semibold text-[var(--muted-2)] uppercase">
                      Количество
                    </p>
                    <p className="mt-1 text-lg font-extrabold">
                      {detailsGroup.items.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
                    <p className="text-[10px] font-semibold text-[var(--muted-2)] uppercase">
                      Общая оценка
                    </p>
                    <p className="mt-1 truncate text-lg font-extrabold">
                      {detailsGroup.items
                        .reduce((sum, nft) => sum + nft.valueRub, 0)
                        .toLocaleString("ru-RU")}{" "}
                      ₽
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <h4 className="text-sm font-extrabold">Экземпляры</h4>
                  <span className="text-[11px] text-[var(--muted-2)]">
                    {detailsGroup.items.length} всего
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {detailsGroup.items.map((nft, index) => (
                    <article
                      className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel)] p-3"
                      key={nft.id}
                    >
                      <span className="profile-accent-soft profile-accent-text grid size-10 shrink-0 place-items-center rounded-2xl text-[12px] font-extrabold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-extrabold">
                          {nft.valueRub.toLocaleString("ru-RU")} ₽
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--muted-2)]">
                          ID · {nft.id.slice(-10)}
                        </p>
                      </div>
                      {mine ? (
                        <button
                          className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-[11px] font-bold hover:border-white/20"
                          onClick={() => setTransfer({ nft, to: "", step: 1 })}
                          type="button"
                        >
                          Передать
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {transfer ? (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/75 p-3 sm:items-center sm:p-5"
            onClick={() => setTransfer(null)}
          >
            <div
              className="w-full rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Передача NFT</p>
                  <p className="mt-1 text-xs text-[var(--muted-2)]">
                    {transfer.nft.name}
                  </p>
                </div>
                <button
                  className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/10 text-xl text-white"
                  onClick={() => setTransfer(null)}
                  type="button"
                >
                  ×
                </button>
              </div>
              {transfer.step === 1 ? (
                <>
                  <input
                    className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    onChange={(event) =>
                      setTransfer({ ...transfer, to: event.target.value })
                    }
                    placeholder="Ник получателя"
                    value={transfer.to}
                  />
                  <p className="mt-3 text-[13px]">
                    Подтверждение 1/2. Точно передать этот NFT?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm"
                      onClick={() => setTransfer(null)}
                      type="button"
                    >
                      Нет
                    </button>
                    <button
                      className="profile-accent-button flex-1 rounded-full py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={!transfer.to.trim()}
                      onClick={() => setTransfer({ ...transfer, step: 2 })}
                      type="button"
                    >
                      Да, дальше
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-[13px]">
                    Подтверждение 2/2. Отменить будет нельзя. Передать{" "}
                    <b>{transfer.nft.name}</b> пользователю <b>{transfer.to}</b>
                    ?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm"
                      onClick={() => setTransfer(null)}
                      type="button"
                    >
                      Отмена
                    </button>
                    <button
                      className="flex-1 rounded-full bg-red-500/90 py-2 text-sm font-semibold text-white"
                      onClick={() => void confirmTransfer()}
                      type="button"
                    >
                      Передать
                    </button>
                  </div>
                </>
              )}
              {transferError ? (
                <p className="mt-2 text-xs text-red-300">{transferError}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
