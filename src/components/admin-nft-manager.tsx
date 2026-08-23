"use client";

import { useEffect, useState } from "react";
import { VerifiedName } from "@/components/verified-name";

type AdminNftUser = {
  id: string;
  nickname: string;
  displayName: string;
  isVerified: boolean;
  isHyperVerified: boolean;
};

type AdminNft = {
  id: string;
  name: string;
  imageUrl: string;
  valueRub: number;
  createdAt: string;
  owner: AdminNftUser;
  creator: AdminNftUser | null;
  transferCount: number;
};

type Recipient = AdminNftUser & { avatarUrl?: string };

type TransferState = {
  nft: AdminNft;
  to: string;
  step: 1 | 2;
};

function ownerLabel(user: AdminNftUser) {
  return user.displayName || user.nickname;
}

export function AdminNftManager() {
  const [query, setQuery] = useState("");
  const [nfts, setNfts] = useState<AdminNft[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("dirami-nfts-changed", refresh);
    return () => window.removeEventListener("dirami-nfts-changed", refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setMessage((current) =>
          current.includes("передан пользователю") ? current : "",
        );
        try {
          const response = await fetch(
            `/api/admin/nfts?q=${encodeURIComponent(query.trim())}`,
            { cache: "no-store", signal: controller.signal },
          );
          const data = (await response.json()) as {
            nfts?: AdminNft[];
            total?: number;
            nextCursor?: string | null;
            error?: string;
          };
          if (!response.ok)
            throw new Error(data.error ?? "Не удалось загрузить NFT");
          setNfts(data.nfts ?? []);
          setTotal(data.total ?? 0);
          setNextCursor(data.nextCursor ?? null);
        } catch (error) {
          if (!controller.signal.aborted) {
            setMessage(
              error instanceof Error ? error.message : "Сеть недоступна",
            );
            setNfts([]);
            setTotal(0);
            setNextCursor(null);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query.trim() ? 280 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, refreshKey]);

  useEffect(() => {
    if (!transfer || transfer.step !== 1 || transfer.to.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRecipientLoading(true);
      try {
        const response = await fetch(
          `/api/admin/users?q=${encodeURIComponent(transfer.to.trim())}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = (await response.json()) as {
          users?: Recipient[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Ошибка поиска");
        setRecipients((data.users ?? []).slice(0, 6));
      } catch {
        if (!controller.signal.aborted) setRecipients([]);
      } finally {
        if (!controller.signal.aborted) setRecipientLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [transfer]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/nfts?q=${encodeURIComponent(query.trim())}&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        nfts?: AdminNft[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Не удалось загрузить ещё");
      setNfts((current) => [...current, ...(data.nfts ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Сеть недоступна");
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmTransfer() {
    if (!transfer || transfer.step !== 2 || transferring) return;
    setTransferring(true);
    setMessage("");
    setTransferError("");
    try {
      const response = await fetch("/api/admin/nfts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nftId: transfer.nft.id,
          toNickname: transfer.to,
        }),
      });
      const data = (await response.json()) as {
        nft?: AdminNft;
        error?: string;
      };
      if (!response.ok || !data.nft) {
        throw new Error(data.error ?? "Не удалось передать NFT");
      }
      setNfts((current) =>
        current.map((nft) => (nft.id === data.nft!.id ? data.nft! : nft)),
      );
      setMessage(
        `NFT «${data.nft.name}» передан пользователю @${data.nft.owner.nickname}`,
      );
      setTransfer(null);
      window.dispatchEvent(new Event("dirami-nfts-changed"));
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : "Сеть недоступна",
      );
    } finally {
      setTransferring(false);
    }
  }

  return (
    <section className="rounded-3xl border border-violet-300/20 bg-[var(--panel)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-300/10 text-xl text-violet-200">
            ◇
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold">Управление NFT</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--muted-2)]">
              Все текущие NFT. Администратор может передать любой экземпляр от
              его владельца любому пользователю.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-violet-300/10 px-2.5 py-1 text-[10px] font-black text-violet-200">
          {total}
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm"
          onChange={(event) => {
            setQuery(event.target.value);
            setMessage("");
          }}
          placeholder="Название, ID, владелец или создатель"
          value={query}
        />
        <button
          aria-label="Обновить список NFT"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-lg transition hover:border-violet-300/40"
          onClick={() => {
            setMessage("");
            setRefreshKey((value) => value + 1);
          }}
          type="button"
        >
          ↻
        </button>
      </div>

      <div className="scrollbar-thin mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-0.5">
        {loading ? (
          <p className="py-10 text-center text-xs text-[var(--muted-2)]">
            Загружаем NFT…
          </p>
        ) : nfts.length ? (
          nfts.map((nft) => (
            <article
              className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg)] p-2.5"
              key={nft.id}
            >
              <div className="flex gap-3">
                {/* User-provided URL is intentionally rendered as a public NFT image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={nft.name}
                  className="size-16 shrink-0 rounded-2xl object-cover"
                  src={nft.imageUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{nft.name}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-amber-200">
                        {nft.valueRub.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <a
                      aria-label="Открыть публичную страницу NFT"
                      className="grid size-8 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-xs text-[var(--muted)] hover:text-white"
                      href={`/u/nft/${encodeURIComponent(nft.id)}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="mt-2 truncate text-[10px] text-[var(--muted-2)]">
                    Владелец:{" "}
                    <b className="text-[var(--muted)]">@{nft.owner.nickname}</b>
                    {" · "}передач: {nft.transferCount}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--muted-2)]">
                    {nft.id}
                  </p>
                </div>
              </div>
              <button
                className="mt-2.5 flex w-full items-center justify-between rounded-2xl bg-violet-300/10 px-3 py-2.5 text-[11px] font-black text-violet-200 hover:bg-violet-300/15"
                onClick={() => {
                  setRecipients([]);
                  setMessage("");
                  setTransferError("");
                  setTransfer({ nft, to: "", step: 1 });
                }}
                type="button"
              >
                <span>Передать от @{nft.owner.nickname}</span>
                <span>→</span>
              </button>
            </article>
          ))
        ) : (
          <p className="py-10 text-center text-xs text-[var(--muted-2)]">
            {query.trim() ? "Ничего не найдено" : "NFT пока нет"}
          </p>
        )}
      </div>

      {!loading && nextCursor ? (
        <button
          className="mt-3 w-full rounded-full border border-[var(--border)] py-2.5 text-xs font-bold hover:bg-white/5 disabled:opacity-50"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          type="button"
        >
          {loadingMore
            ? "Загружаем…"
            : `Показать ещё · сейчас ${nfts.length} из ${total}`}
        </button>
      ) : null}

      {message ? (
        <p
          className={`mt-3 rounded-2xl px-3 py-2.5 text-xs ${
            message.includes("передан пользователю")
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-red-400/10 text-red-300"
          }`}
        >
          {message}
        </p>
      ) : null}

      {transfer ? (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/80 p-3 sm:items-center"
          onClick={() => !transferring && setTransfer(null)}
        >
          <section
            className="w-full max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.13em] text-violet-200 uppercase">
                  Административная передача
                </p>
                <h3 className="mt-1 truncate text-lg font-black">
                  {transfer.nft.name}
                </h3>
                <p className="mt-1 text-xs text-[var(--muted-2)]">
                  Текущий владелец: @{transfer.nft.owner.nickname}
                </p>
              </div>
              <button
                aria-label="Закрыть передачу NFT"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-2xl"
                disabled={transferring}
                onClick={() => setTransfer(null)}
                type="button"
              >
                ×
              </button>
            </div>

            {transfer.step === 1 ? (
              <>
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-[11px] font-bold text-[var(--muted-2)]">
                    Новый владелец
                  </span>
                  <div className="flex items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3">
                    <span className="text-sm text-[var(--muted-2)]">@</span>
                    <input
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent py-3 text-sm"
                      maxLength={25}
                      onChange={(event) =>
                        setTransfer({
                          ...transfer,
                          to: event.target.value.replace(/^@/, ""),
                        })
                      }
                      placeholder="username"
                      value={transfer.to}
                    />
                  </div>
                </label>

                {transfer.to.trim().length >= 2 ? (
                  <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                    {recipientLoading ? (
                      <p className="px-3 py-4 text-center text-xs text-[var(--muted-2)]">
                        Ищем пользователя…
                      </p>
                    ) : recipients.length ? (
                      recipients.map((user) => (
                        <button
                          className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/5 disabled:opacity-40"
                          disabled={user.id === transfer.nft.owner.id}
                          key={user.id}
                          onClick={() =>
                            setTransfer({ ...transfer, to: user.nickname })
                          }
                          type="button"
                        >
                          <span className="min-w-0">
                            <VerifiedName
                              className="block truncate text-sm font-bold"
                              isHyperVerified={user.isHyperVerified}
                              isVerified={user.isVerified}
                              name={ownerLabel(user)}
                            />
                            <span className="block truncate text-[10px] text-[var(--muted-2)]">
                              @{user.nickname}
                            </span>
                          </span>
                          {user.id === transfer.nft.owner.id ? (
                            <span className="text-[9px] text-[var(--muted-2)]">
                              уже владелец
                            </span>
                          ) : (
                            <span>›</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-center text-xs text-[var(--muted-2)]">
                        Пользователь не найден
                      </p>
                    )}
                  </div>
                ) : null}

                <p className="mt-4 text-[11px] leading-5 text-[var(--muted-2)]">
                  Передача будет записана в историю NFT от текущего владельца к
                  выбранному пользователю.
                </p>
                <button
                  className="mt-3 w-full rounded-full bg-violet-400 py-3 text-sm font-black text-white disabled:opacity-40"
                  disabled={!transfer.to.trim()}
                  onClick={() => setTransfer({ ...transfer, step: 2 })}
                  type="button"
                >
                  Проверить передачу
                </button>
              </>
            ) : (
              <>
                <div className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-4 text-sm leading-6">
                  <p>
                    NFT <b>«{transfer.nft.name}»</b>
                  </p>
                  <p className="mt-2 text-[var(--muted)]">
                    @{transfer.nft.owner.nickname}{" "}
                    <span className="px-1">→</span>{" "}
                    <b className="text-white">
                      @{transfer.to.replace(/^@/, "")}
                    </b>
                  </p>
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-200">
                  Проверьте получателя. Отмена этой операции через интерфейс не
                  предусмотрена.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="rounded-full border border-[var(--border)] py-3 text-sm font-bold"
                    disabled={transferring}
                    onClick={() => setTransfer({ ...transfer, step: 1 })}
                    type="button"
                  >
                    Назад
                  </button>
                  <button
                    className="rounded-full bg-red-500 py-3 text-sm font-black text-white disabled:opacity-50"
                    disabled={transferring}
                    onClick={() => void confirmTransfer()}
                    type="button"
                  >
                    {transferring ? "Передаём…" : "Передать NFT"}
                  </button>
                </div>
              </>
            )}

            {transferError ? (
              <p className="mt-3 rounded-2xl bg-red-400/10 px-3 py-2.5 text-xs text-red-300">
                {transferError}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
