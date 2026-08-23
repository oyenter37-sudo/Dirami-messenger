"use client";

import { useEffect, useState } from "react";
import { RichText } from "@/components/rich-text";
import { ShareLinkActions } from "@/components/share-link-actions";
import { VerifiedName } from "@/components/verified-name";
import type { NftDetails, NftPerson } from "@/lib/types";

type Props = {
  nftId: string;
  onClose: () => void;
  onOpenProfile?: (user: NftPerson) => void;
};

function dateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NftDetailsModal({ nftId, onClose, onOpenProfile }: Props) {
  const [nft, setNft] = useState<NftDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/nft/${encodeURIComponent(nftId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          nft?: NftDetails;
          error?: string;
        };
        if (!response.ok || !data.nft) {
          throw new Error(data.error ?? "Не удалось загрузить NFT");
        }
        if (!cancelled) setNft(data.nft);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "NFT недоступен");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [nftId]);

  const givenBy = nft?.receivedFrom ?? nft?.creator ?? null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden bg-black/80 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        className="nft-sheet-in flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-[var(--border)] bg-[var(--bg)] shadow-[0_35px_100px_rgba(0,0,0,.75)] sm:max-h-[92vh] sm:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.14em] text-amber-200 uppercase">
              NFT Dirami
            </p>
            <h2 className="truncate text-lg font-black">
              Подробная информация
            </h2>
          </div>
          <button
            aria-label="Закрыть NFT"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-[27px] leading-none text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {error ? (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : !nft ? (
            <div className="py-20 text-center text-sm text-[var(--muted-2)]">
              Загружаем NFT…
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)]">
                {/* User-provided URL is intentionally rendered as a public NFT image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={nft.name}
                  className="aspect-square w-full object-cover"
                  src={nft.imageUrl}
                />
                <div className="p-4">
                  <h3 className="text-xl font-black">
                    <RichText text={nft.name} />
                  </h3>
                  <p className="mt-1 text-sm font-black text-amber-200">
                    {nft.valueRub.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-[9px] font-bold text-[var(--muted-2)] uppercase">
                    Получен
                  </p>
                  <p className="mt-1 text-xs font-bold">
                    {dateTime(nft.receivedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-[9px] font-bold text-[var(--muted-2)] uppercase">
                    Передач
                  </p>
                  <p className="mt-1 text-lg font-black">{nft.transferCount}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {givenBy ? (
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3 text-left"
                    onClick={() => onOpenProfile?.(givenBy)}
                    type="button"
                  >
                    <span>
                      <span className="block text-[9px] font-bold text-[var(--muted-2)] uppercase">
                        Кто передал
                      </span>
                      <VerifiedName
                        className="mt-1 text-sm font-black"
                        hyperAppearance={givenBy}
                        isHyperVerified={givenBy.isHyperVerified}
                        isVerified={givenBy.isVerified}
                        name={givenBy.displayName || givenBy.nickname}
                      />
                    </span>
                    {onOpenProfile ? <span>›</span> : null}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
                    <span className="block text-[9px] font-bold text-[var(--muted-2)] uppercase">
                      Кто передал
                    </span>
                    <p className="mt-1 text-sm font-bold text-[var(--muted-2)]">
                      Данные не сохранились
                    </p>
                  </div>
                )}

                <button
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3 text-left"
                  onClick={() => onOpenProfile?.(nft.owner)}
                  type="button"
                >
                  <span>
                    <span className="block text-[9px] font-bold text-[var(--muted-2)] uppercase">
                      Текущий владелец
                    </span>
                    <VerifiedName
                      className="mt-1 text-sm font-black"
                      hyperAppearance={nft.owner}
                      isHyperVerified={nft.owner.isHyperVerified}
                      isVerified={nft.owner.isVerified}
                      name={nft.owner.displayName || nft.owner.nickname}
                    />
                  </span>
                  {onOpenProfile ? <span>›</span> : null}
                </button>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3.5 py-3">
                  <span className="block text-[9px] font-bold text-[var(--muted-2)] uppercase">
                    Выпустил
                  </span>
                  {nft.creator ? (
                    <VerifiedName
                      className="mt-1 text-sm font-black"
                      hyperAppearance={nft.creator}
                      isHyperVerified={nft.creator.isHyperVerified}
                      isVerified={nft.creator.isVerified}
                      name={nft.creator.displayName || nft.creator.nickname}
                    />
                  ) : (
                    <p className="mt-1 text-sm font-bold text-[var(--muted-2)]">
                      Данные не сохранились
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-[var(--muted-2)]">
                    Создан {dateTime(nft.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-[var(--border)] bg-black/15 p-3.5">
                <p className="text-[9px] font-bold text-[var(--muted-2)] uppercase">
                  Уникальный ID
                </p>
                <p className="mt-1 break-all font-mono text-[11px] leading-5 text-[var(--muted)]">
                  {nft.id}
                </p>
              </div>

              <div className="mt-4">
                <ShareLinkActions
                  path={`/u/nft/${encodeURIComponent(nft.id)}`}
                  title={`NFT ${nft.name}`}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
