"use client";

import { useEffect, useState } from "react";
import { NewsSkeleton } from "@/components/skeletons";
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

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function newsTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const now = new Date();
  const dayMs = 86_400_000;
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diffDays = Math.round((todayStart - dayStart) / dayMs);
  if (diffDays <= 0) return `Сегодня, ${time}`;
  if (diffDays === 1) return `Вчера, ${time}`;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${time}`;
}

function NewsCard({ item }: { item: NewsItem }) {
  const authorName = item.author.displayName || item.author.nickname;
  const monogram = (authorName.trim()[0] ?? "D").toUpperCase();

  return (
    <article
      className={`news-card relative overflow-hidden rounded-[1.5rem] border p-4 ${
        item.unread
          ? "border-[var(--accent)]/40 bg-[linear-gradient(150deg,var(--accent-muted),var(--panel)_58%)]"
          : "border-[var(--border)] bg-[var(--panel)]"
      }`}
    >
      {item.unread ? (
        <span className="absolute right-4 top-5 grid size-2.5 place-items-center">
          <span className="absolute size-2.5 rounded-full bg-accent/35" />
          <span className="relative size-[7px] rounded-full bg-accent" />
        </span>
      ) : null}
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))] text-[13px] font-black text-on-accent shadow-[0_8px_18px_-10px_var(--accent)]"
        >
          {monogram}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-tight">
            <VerifiedName
              hyperAppearance={item.author}
              isHyperVerified={item.author.isHyperVerified}
              isVerified={item.author.isVerified}
              name={authorName}
            />
          </p>
          <p className="mt-0.5 text-[10.5px] leading-tight text-[var(--muted-2)]">
            {newsTime(item.createdAt)}
          </p>
        </div>
      </div>
      <h3 className="mt-3 break-words pr-6 text-[16px] font-extrabold leading-snug">
        <RichText text={item.title} />
      </h3>
      <div className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.65] text-[var(--muted)]">
        <RichText text={item.content} />
      </div>
    </article>
  );
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
            className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] active:scale-95"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="flex items-center gap-3.5 rounded-[1.6rem] border border-[var(--accent)]/25 bg-[linear-gradient(135deg,var(--accent-muted),var(--panel))] p-4">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-xl font-black text-on-accent shadow-[0_10px_24px_-12px_var(--accent)]"
            >
              N
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-black leading-tight">
                Что нового
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-[var(--muted-2)]">
                Пятьдесят последних публикаций команды Dirami.
              </p>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : news === null ? (
            <NewsSkeleton />
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
                <NewsCard item={item} key={item.id} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
