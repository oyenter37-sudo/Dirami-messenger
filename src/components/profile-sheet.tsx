"use client";

import { useEffect, useMemo, useState } from "react";
import { avatarColor, initials } from "@/lib/avatar";
import { RichText } from "@/components/rich-text";
import type { NftItem, PublicUser } from "@/lib/types";

type Props = {
  userId: string;
  meId: string;
  fallback?: Pick<PublicUser, "nickname" | "bio">;
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
      ? { id: userId, nickname: fallback.nickname, bio: fallback.bio, nfts: [] }
      : null,
  );
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [bioMsg, setBioMsg] = useState("");
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
        if (!cancelled && data.user) {
          setUser(data.user);
          setBioDraft(data.user.bio);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!detailsKey && !transfer) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (transfer) setTransfer(null);
      else setDetailsKey(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsKey, transfer]);

  const nickname = user?.nickname ?? fallback?.nickname ?? "…";
  const bio = user?.bio ?? fallback?.bio ?? "";
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
  const detailsGroup = nftGroups.find((group) => group.key === detailsKey) ?? null;
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      })
    : null;

  async function saveBio() {
    setBioMsg("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bio: bioDraft }),
      });
      const data = (await response.json()) as { error?: string; user?: { bio: string } };
      if (!response.ok) {
        setBioMsg(data.error ?? "Не сохранилось");
        return;
      }
      setUser((current) =>
        current ? { ...current, bio: data.user?.bio ?? bioDraft } : current,
      );
      setEditing(false);
    } catch {
      setBioMsg("Сеть недоступна");
    }
  }

  async function confirmTransfer() {
    if (!transfer || transfer.step !== 2) return;
    setTransferError("");
    try {
      const response = await fetch("/api/nft/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nftId: transfer.nft.id, toNickname: transfer.to }),
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
      className="overlay-in absolute inset-0 z-30 flex items-end justify-center bg-black/65 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="profile-in relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden bg-[var(--bg)] shadow-2xl sm:rounded-2xl sm:border sm:border-[var(--border)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0">
          <div className="h-32 bg-[linear-gradient(120deg,var(--accent),var(--accent-soft))]" />
          <button
            className="absolute top-3 left-3 z-20 grid size-9 place-items-center rounded-full bg-black/50 text-lg text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
          <div
            className={`absolute left-4 -bottom-12 z-20 grid size-24 place-items-center rounded-full border-[4px] border-[var(--bg)] text-2xl font-semibold text-white ${avatarColor(
              nickname,
            )}`}
          >
            {initials(nickname)}
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pt-16 pb-8">
          {mine ? (
            <div className="mb-3 flex justify-end">
              <button
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-semibold hover:bg-white/5"
                onClick={() => {
                  setBioDraft(bio);
                  setEditing((value) => !value);
                }}
                type="button"
              >
                {editing ? "Отмена" : "Изменить описание"}
              </button>
            </div>
          ) : (
            <div className="h-3" />
          )}

          <h1 className="text-[22px] leading-7 font-extrabold tracking-tight">
            <RichText text={nickname} />
          </h1>
          <p className="text-[15px] text-[var(--muted-2)]">@{nickname}</p>
          {joined ? (
            <p className="mt-2 text-[13px] text-[var(--muted-2)]">Регистрация: {joined}</p>
          ) : null}

          {mine && editing ? (
            <div className="mt-4">
              <textarea
                className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
                maxLength={280}
                onChange={(event) => setBioDraft(event.target.value)}
                value={bioDraft}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted-2)]">{bioDraft.length}/280</span>
                <button
                  className="hover-accent rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
                  onClick={() => void saveBio()}
                  type="button"
                >
                  Сохранить
                </button>
              </div>
              {bioMsg ? <p className="mt-1 text-xs text-red-300">{bioMsg}</p> : null}
            </div>
          ) : (
            <p className="mt-3 text-[15px] leading-6">
              {bio.trim() ? <RichText text={bio} /> : "Пока без описания"}
            </p>
          )}

          <div className="mt-7">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold">{mine ? "Мои NFT" : "NFT"}</h2>
              <span className="text-xs text-[var(--muted-2)]">{nfts.length}</span>
            </div>

            {nfts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted-2)]">
                Коллекция пуста
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
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
                        aria-label={multiple ? `Открыть ${group.name}` : group.name}
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
                          <span className="absolute top-2 left-2 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
                            {group.items.length} шт.
                          </span>
                        ) : null}
                      </button>

                      <div className="px-2 pt-2.5 pb-1.5">
                        <p className="truncate text-[13px] font-bold leading-5">{group.name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-amber-200/90">
                          ≈ {price}
                        </p>
                      </div>

                      {multiple ? (
                        <button
                          className="mt-1 flex w-full items-center justify-between rounded-2xl bg-accent-muted px-3 py-2.5 text-[12px] font-bold text-accent-soft transition hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                          onClick={() => setDetailsKey(group.key)}
                          type="button"
                        >
                          <span>Подробнее</span>
                          <span className="grid size-5 place-items-center rounded-full bg-black/10 text-sm">→</span>
                        </button>
                      ) : mine ? (
                        <button
                          className="mt-1 w-full rounded-2xl px-3 py-2.5 text-center text-[12px] font-semibold text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
                          onClick={() => setTransfer({ nft, to: "", step: 1 })}
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
          </div>
        </div>

        {detailsGroup ? (
          <div
            className="absolute inset-0 z-30 flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:p-5"
            onClick={() => setDetailsKey(null)}
          >
            <section
              aria-label={`Экземпляры ${detailsGroup.name}`}
              className="profile-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-[var(--border)] bg-[var(--bg)] shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:max-h-[82vh] sm:rounded-[2rem]"
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
                  <h3 className="truncate text-[17px] font-extrabold">Все экземпляры</h3>
                </div>
                <button
                  aria-label="Закрыть список NFT"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-[27px] leading-none text-white shadow-lg transition hover:scale-105 hover:bg-white/15"
                  onClick={() => setDetailsKey(null)}
                  title="Закрыть"
                  type="button"
                >
                  ×
                </button>
              </header>

              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-4 rounded-[1.6rem] border border-[var(--border)] bg-[var(--panel)] p-3">
                    <img
                      alt={detailsGroup.name}
                      className="size-24 shrink-0 rounded-[1.25rem] object-cover shadow-[0_14px_34px_-16px_rgba(0,0,0,0.9)]"
                      src={detailsGroup.imageUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-extrabold">{detailsGroup.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted-2)]">
                        Одинаковые NFT собраны в одном месте
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-accent-muted px-2.5 py-1 text-[11px] font-bold text-accent-soft">
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
                      <p className="text-[10px] font-semibold text-[var(--muted-2)] uppercase">Количество</p>
                      <p className="mt-1 text-lg font-extrabold">{detailsGroup.items.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
                      <p className="text-[10px] font-semibold text-[var(--muted-2)] uppercase">Общая оценка</p>
                      <p className="mt-1 truncate text-lg font-extrabold">
                        {detailsGroup.items
                          .reduce((sum, nft) => sum + nft.valueRub, 0)
                          .toLocaleString("ru-RU")} ₽
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
                        key={nft.id}
                        className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:border-white/15"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-muted text-[12px] font-extrabold text-accent-soft">
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
                            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-[11px] font-bold transition hover:border-[var(--accent)] hover:text-accent-soft"
                            onClick={() => setTransfer({ nft, to: "", step: 1 })}
                            type="button"
                          >
                            Передать
                          </button>
                        ) : (
                          <span className="pr-1 text-[10px] text-[var(--muted-2)]">#{index + 1}</span>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {transfer ? (
          <div
            className="absolute inset-0 z-40 flex items-end bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-5"
            onClick={() => setTransfer(null)}
          >
            <div
              className="relative w-full rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Передача NFT</p>
                  <p className="mt-1 text-xs text-[var(--muted-2)]">{transfer.nft.name}</p>
                </div>
                <button
                  aria-label="Закрыть передачу NFT"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-xl text-white hover:bg-white/15"
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
                    onChange={(event) => setTransfer({ ...transfer, to: event.target.value })}
                    placeholder="Ник получателя"
                    value={transfer.to}
                  />
                  <p className="mt-3 text-[13px]">Подтверждение 1/2. Точно передать этот NFT?</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-full border border-[var(--border)] py-2 text-sm"
                      onClick={() => setTransfer(null)}
                      type="button"
                    >
                      Нет
                    </button>
                    <button
                      className="hover-accent flex-1 rounded-full bg-accent py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
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
                    <b>{transfer.nft.name}</b> пользователю <b>{transfer.to}</b>?
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
