"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarColor, initials } from "@/lib/avatar";
import type { ChatMessage, ChatPreview, SessionUser } from "@/lib/types";

type Props = {
  me: SessionUser;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function previewText(content: string) {
  return content.length > 42 ? `${content.slice(0, 42)}…` : content;
}

export function MessengerApp({ me }: Props) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selected = chats.find((chat) => chat.user.id === peerId) ?? null;

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => chat.user.nickname.toLowerCase().includes(q));
  }, [chats, query]);

  const goHome = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  const loadChats = useCallback(async () => {
    const response = await fetch("/api/chats", { cache: "no-store" });
    if (response.status === 401) {
      goHome();
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { chats: ChatPreview[] };
    setChats(data.chats);
  }, [goHome]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        if (!cancelled) await loadChats();
      } catch {
        /* polling continues */
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadChats]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goHome();
  }

  return (
    <div className="flex h-full overflow-hidden bg-zinc-950">
      <aside
        className={`h-full w-full shrink-0 flex-col border-r border-white/10 bg-zinc-900 md:w-80 lg:w-96 ${
          peerId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 place-items-center rounded-2xl bg-orange-400 text-sm font-semibold text-zinc-950">
              D
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Dirami</p>
              <p className="truncate text-xs text-zinc-400">{me.nickname}</p>
            </div>
          </div>
          <button
            className="rounded-xl px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            onClick={() => void logout()}
            type="button"
          >
            Выйти
          </button>
        </div>

        <div className="px-3 py-3">
          <input
            className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-600"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
            value={query}
          />
        </div>

        <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {visibleChats.length === 0 ? (
            <li className="px-3 py-6 text-sm text-zinc-500">
              Пока нет других пользователей.
            </li>
          ) : (
            visibleChats.map((chat) => {
              const active = chat.user.id === peerId;
              return (
                <li key={chat.user.id}>
                  <button
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      active ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                    onClick={() => setPeerId(chat.user.id)}
                    type="button"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${avatarColor(
                        chat.user.nickname,
                      )}`}
                    >
                      {initials(chat.user.nickname)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {chat.user.nickname}
                        </span>
                        {chat.lastMessage ? (
                          <span className="shrink-0 text-[11px] text-zinc-500">
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-zinc-500">
                          {chat.lastMessage
                            ? `${chat.lastMessage.senderId === me.userId ? "Вы: " : ""}${previewText(chat.lastMessage.content)}`
                            : "Нет сообщений"}
                        </span>
                        {chat.unread > 0 ? (
                          <span className="grid min-w-5 place-items-center rounded-full bg-orange-400 px-1.5 text-[11px] font-semibold text-zinc-950">
                            {chat.unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section
        className={`h-full min-w-0 flex-1 flex-col ${peerId ? "flex" : "hidden md:flex"}`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-orange-400/15 text-2xl font-semibold text-orange-300">
              D
            </span>
            <p className="text-lg font-medium">Выберите чат</p>
            <p className="max-w-sm text-sm text-zinc-500">
              Слева все, кто уже зарегистрировался. Новые сообщения подтягиваются
              polling-запросом.
            </p>
          </div>
        ) : (
          <Conversation
            key={selected.user.id}
            me={me}
            peer={selected.user}
            onBack={() => setPeerId(null)}
            onAuthLost={goHome}
            onSent={() => void loadChats()}
          />
        )}
      </section>
    </div>
  );
}

function Conversation({
  me,
  peer,
  onBack,
  onAuthLost,
  onSent,
}: {
  me: SessionUser;
  peer: { id: string; nickname: string };
  onBack: () => void;
  onAuthLost: () => void;
  onSent: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const afterRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async (incremental: boolean) => {
      if (document.visibilityState === "hidden") return;

      const params = new URLSearchParams({ peerId: peer.id });
      const after = incremental ? afterRef.current : null;
      if (after) params.set("after", after);

      try {
        const response = await fetch(`/api/messages?${params.toString()}`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          onAuthLost();
          return;
        }
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { messages: ChatMessage[] };
        if (cancelled) return;

        if (!incremental) {
          setMessages(data.messages);
        } else if (data.messages.length > 0) {
          setMessages((current) => {
            const seen = new Set(current.map((item) => item.id));
            const next = [...current];
            for (const message of data.messages) {
              if (!seen.has(message.id)) next.push(message);
            }
            return next;
          });
        }

        const last = data.messages.at(-1);
        if (last) afterRef.current = last.createdAt;
      } catch {
        /* polling continues */
      }
    };

    void tick(false);
    const timer = window.setInterval(() => {
      void tick(true);
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [peer.id, onAuthLost]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ peerId: peer.id, content }),
      });
      const data = (await response.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!response.ok || !data.message) {
        setError(data.error ?? "Не отправилось");
        return;
      }

      setDraft("");
      setMessages((current) =>
        current.some((item) => item.id === data.message!.id)
          ? current
          : [...current, data.message!],
      );
      afterRef.current = data.message.createdAt;
      onSent();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          className="rounded-xl px-2 py-1 text-sm text-zinc-400 hover:bg-white/5 md:hidden"
          onClick={onBack}
          type="button"
        >
          ←
        </button>
        <span
          className={`grid size-9 place-items-center rounded-full text-sm font-semibold text-white ${avatarColor(
            peer.nickname,
          )}`}
        >
          {initials(peer.nickname)}
        </span>
        <div>
          <p className="text-sm font-semibold">{peer.nickname}</p>
          <p className="text-[11px] text-zinc-500">обновление каждые 2 сек</p>
        </div>
      </header>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Напишите первое сообщение
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === me.userId;
            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${
                    mine
                      ? "rounded-br-md bg-orange-400 text-zinc-950"
                      : "rounded-bl-md bg-zinc-800 text-zinc-50"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.content}
                  </p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-zinc-800/70" : "text-zinc-500"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="border-t border-white/10 p-3" onSubmit={(event) => void send(event)}>
        {error ? <p className="mb-2 px-1 text-xs text-red-300">{error}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            className="max-h-36 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={`Сообщение для ${peer.nickname}`}
            rows={1}
            value={draft}
          />
          <button
            className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-orange-300 disabled:opacity-50"
            disabled={sending || !draft.trim()}
            type="submit"
          >
            Отправить
          </button>
        </div>
      </form>
    </>
  );
}
