"use client";

import { useEffect, useState } from "react";
import { avatarColor, initials } from "@/lib/avatar";
import { RichText } from "@/components/rich-text";
import type { NftItem, PublicUser } from "@/lib/types";

type Props = {
  userId: string;
  meId: string;
  fallback?: Pick<PublicUser, "nickname" | "bio">;
  onClose: () => void;
};

export function ProfileSheet({ userId, meId, fallback, onClose }: Props) {
  const [user, setUser] = useState<PublicUser | null>(
    fallback
      ? { id: userId, nickname: fallback.nickname, bio: fallback.bio, nfts: [] }
      : null,
  );
  const [transfer, setTransfer] = useState<{
    nft: NftItem;
    to: string;
    step: 1 | 2;
  } | null>(null);
  const [transferError, setTransferError] = useState("");

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

  const nickname = user?.nickname ?? fallback?.nickname ?? "…";
  const bio = user?.bio ?? fallback?.bio ?? "";
  const nfts = user?.nfts ?? [];
  const mine = userId === meId;
  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      })
    : null;

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
      await reload();
    } catch {
      setTransferError("Сеть недоступна");
    }
  }

  return (
    <div
      className="overlay-in absolute inset-0 z-20 flex items-end justify-center bg-black/65 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="profile-in relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden bg-[var(--bg)] shadow-2xl sm:rounded-[1.4rem] sm:border sm:border-[var(--border)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-36 shrink-0 bg-[linear-gradient(120deg,var(--accent),var(--accent-soft),var(--panel))]">
          <button
            className="absolute top-3 left-3 grid size-9 place-items-center rounded-full bg-black/45 text-lg text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-8">
          <div className="flex items-end justify-between">
            <span
              className={`-mt-12 grid size-24 place-items-center rounded-full border-4 border-[var(--bg)] text-2xl font-semibold text-white ${avatarColor(
                nickname,
              )}`}
            >
              {initials(nickname)}
            </span>
          </div>

          <h1 className="mt-3 text-[22px] leading-7 font-extrabold tracking-tight">
            <RichText text={nickname} />
          </h1>
          <p className="text-[15px] text-[var(--muted-2)]">@{nickname}</p>
          {joined ? (
            <p className="mt-2 text-[13px] text-[var(--muted-2)]">Регистрация: {joined}</p>
          ) : null}

          <p className="mt-3 text-[15px] leading-6">
            {bio.trim() ? <RichText text={bio} /> : "Пока без описания"}
          </p>

          <div className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold">NFT</h2>
              <span className="text-xs text-[var(--muted-2)]">{nfts.length}</span>
            </div>

            {nfts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted-2)]">
                Коллекция пуста
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {nfts.map((nft) => (
                  <article
                    key={nft.id}
                    className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_40px_-24px_rgba(0,0,0,0.8)]"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        alt={nft.name}
                        className="h-full w-full object-cover"
                        src={nft.imageUrl}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2">
                        <p className="truncate text-sm font-bold text-white">{nft.name}</p>
                        <p className="text-[12px] text-amber-200">
                          ~ {nft.valueRub.toLocaleString("ru-RU")} ₽
                        </p>
                      </div>
                    </div>
                    {mine ? (
                      <button
                        className="w-full py-2 text-center text-[12px] font-semibold text-[var(--muted)] hover:bg-white/5"
                        onClick={() =>
                          setTransfer({ nft, to: "", step: 1 })
                        }
                        type="button"
                      >
                        Передать
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {transfer ? (
          <div className="absolute inset-0 z-10 flex items-end bg-black/55 p-4 sm:items-center">
            <div className="w-full rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-sm font-bold">Передача NFT</p>
              <p className="mt-1 text-xs text-[var(--muted-2)]">{transfer.nft.name}</p>
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
