"use client";

import { useState } from "react";

export function AdminNewsPublisher() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        setMessage(`Ошибка сервера (${response.status})`);
        return;
      }
      if (!response.ok) {
        setMessage(data.error ?? "Не удалось опубликовать новость");
        return;
      }
      setTitle("");
      setContent("");
      setMessage("Новость опубликована для всех пользователей");
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setPublishing(false);
    }
  }

  const ready = title.trim().length > 0 && content.trim().length > 0;

  return (
    <section className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--panel)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">Публикация новости</p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--muted-2)]">
            Новость увидят все пользователи. Хранятся только пятьдесят последних
            публикаций.
          </p>
        </div>
        <span className="rounded-full bg-accent-muted px-2.5 py-1 text-[9px] font-black text-accent-soft uppercase">
          Админ
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <input
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Заголовок новости"
          value={title}
        />
        <textarea
          className="min-h-32 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm leading-6"
          maxLength={3000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Текст новости"
          value={content}
        />
        <div className="flex justify-between text-[10px] text-[var(--muted-2)]">
          <span>Самая старая публикация удалится автоматически</span>
          <span>{content.length}/3000</span>
        </div>
      </div>

      <button
        className="hover-accent mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!ready || publishing}
        onClick={() => void publish()}
        type="button"
      >
        {publishing ? "Публикуем…" : "Опубликовать"}
      </button>
      {message ? (
        <p className="mt-2 text-xs text-[var(--muted-2)]">{message}</p>
      ) : null}
    </section>
  );
}
