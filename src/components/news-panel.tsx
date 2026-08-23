"use client";

import { useEffect, useState } from "react";
import { RichText } from "@/components/rich-text";
import { VerifiedName } from "@/components/verified-name";
import type { NewsItem } from "@/lib/types";

type Props = {
  onClose: () => void;
  onUnreadChange: (count: number) => void;
};

type NewsResponse = {
  news?: NewsItem[];
  unreadCount?: number;
  error?: string;
};

function newsDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NewsPanel({ onClose, onUnreadChange }: Props) {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/news", { cache: "no-store" });
        const data = (await response.json()) as NewsResponse;
        if (!response.ok || !data.news) {
          throw new Error(data.error ?? "Не удалось загрузить новости");
        }
        if (cancelled) return;
        setNews(data.news);
        onUnreadChange(data.unreadCount ?? 0);

        const unreadIds = data.news
          .filter((item) => item.unread)
          .map((item) => item.id);
        if (unreadIds.length === 0) return;
        const readResponse = await fetch("/api/news/read", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ newsIds: unreadIds }),
        });
        if (readResponse.ok && !cancelled) onUnreadChange(0);
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Новости временно недоступны",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [onUnreadChange]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65"
      onClick={onClose}
    >
      <section
        className="sheet-in flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-[-24px_0_70px_rgba(0,0,0,.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-accent-soft uppercase">
              Обновления Dirami
            </p>
            <h2 className="mt-0.5 text-xl font-black">Новости</h2>
          </div>
          <button
            aria-label="Закрыть новости"
            className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl text-[var(--muted)] hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="rounded-[1.6rem] border border-[var(--accent)]/25 bg-[linear-gradient(135deg,var(--accent-muted),var(--panel))] p-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-xl font-black text-on-accent">
              N
            </span>
            <h3 className="mt-4 text-lg font-black">Что нового</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-2)]">
              Здесь хранятся пятьдесят последних публикаций команды Dirami.
            </p>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : news === null ? (
            <div className="py-16 text-center text-sm text-[var(--muted-2)]">
              Загружаем новости…
            </div>
          ) : news.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-[var(--border)] px-5 py-12 text-center">
              <p className="text-sm font-bold">Публикаций пока нет</p>
              <p className="mt-1 text-xs text-[var(--muted-2)]">
                Новые объявления появятся здесь.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {news.map((item) => (
                <article
                  className={`rounded-[1.5rem] border p-4 ${
                    item.unread
                      ? "border-[var(--accent)]/45 bg-accent-muted"
                      : "border-[var(--border)] bg-[var(--panel)]"
                  }`}
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="break-words text-[15px] font-black">
                          <RichText text={item.title} />
                        </h3>
                        {item.unread ? (
                          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-on-accent uppercase">
                            Новое
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--muted-2)]">
                        {newsDate(item.createdAt)} ·{" "}
                        <VerifiedName
                          isHyperVerified={item.author.isHyperVerified}
                          isVerified={item.author.isVerified}
                          name={item.author.displayName || item.author.nickname}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--muted)]">
                    <RichText text={item.content} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
