"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarColor, initials } from "@/lib/avatar";
import { ProfileSheet } from "@/components/profile-sheet";
import { SettingsPanel } from "@/components/settings-panel";
import { AppleEmoji } from "@/components/apple-emoji";
import { RichText } from "@/components/rich-text";
import { REACTIONS } from "@/lib/reactions";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

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
    <div className="relative flex h-full overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-a),transparent_36%)]" />
      <aside
        className={`relative z-10 h-full w-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)] md:w-80 lg:w-96 ${
          peerId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 place-items-center rounded-2xl bg-accent text-sm font-semibold text-on-accent">
              D
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                <RichText text="Dirami" />
              </p>
              <p className="truncate text-xs text-[var(--muted-2)]">
                <RichText text={me.nickname} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="rounded-full px-3 py-1.5 text-xs text-[var(--muted-2)] hover:bg-white/5"
              onClick={() => setSettingsOpen(true)}
              type="button"
            >
              Настройки
            </button>
            <button
              className="rounded-full px-3 py-1.5 text-xs text-[var(--muted-2)] hover:bg-white/5"
              onClick={() => void logout()}
              type="button"
            >
              Выйти
            </button>
          </div>
        </div>

        <div className="px-3 py-3">
          <input
            className="w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm placeholder:text-[var(--muted-2)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
            value={query}
          />
        </div>

        <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {visibleChats.length === 0 ? (
            <li className="px-3 py-6 text-sm text-[var(--muted-2)]">
              Пока нет других пользователей.
            </li>
          ) : (
            visibleChats.map((chat) => {
              const active = chat.user.id === peerId;
              return (
                <li key={chat.user.id}>
                  <button
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      active ? "bg-accent-muted ring-1 ring-[var(--accent)]/40" : "hover:bg-white/5"
                    }`}
                    onClick={() => setPeerId(chat.user.id)}
                    type="button"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${avatarColor(
                        chat.user.nickname,
                      )}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setProfileId(chat.user.id);
                      }}
                    >
                      {initials(chat.user.nickname)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          <RichText text={chat.user.nickname} />
                        </span>
                        {chat.lastMessage ? (
                          <span className="shrink-0 text-[11px] text-[var(--muted-2)]">
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-[var(--muted-2)]">
                          {chat.lastMessage ? (
                            <>
                              {chat.lastMessage.senderId === me.userId ? "Вы: " : ""}
                              <RichText text={previewText(chat.lastMessage.content)} />
                            </>
                          ) : (
                            "Нет сообщений"
                          )}
                        </span>
                        {chat.unread > 0 ? (
                          <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">
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
        className={`chat-wallpaper h-full min-w-0 flex-1 flex-col ${peerId ? "flex" : "hidden md:flex"}`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-accent-muted text-2xl font-semibold text-accent-soft">
              D
            </span>
            <p className="text-lg font-medium">Выберите чат</p>
            <p className="max-w-sm text-sm text-[var(--muted-2)]">
              Слева все, кто уже зарегистрировался.
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
            onOpenProfile={() => setProfileId(selected.user.id)}
          />
        )}
      </section>

      {settingsOpen ? (
        <SettingsPanel nickname={me.nickname} onClose={() => setSettingsOpen(false)} />
      ) : null}
      {profileId ? (
        <ProfileSheet
          userId={profileId}
          fallback={chats.find((chat) => chat.user.id === profileId)?.user}
          onClose={() => setProfileId(null)}
        />
      ) : null}
    </div>
  );
}

function Conversation({
  me,
  peer,
  onBack,
  onAuthLost,
  onSent,
  onOpenProfile,
}: {
  me: SessionUser;
  peer: { id: string; nickname: string };
  onBack: () => void;
  onAuthLost: () => void;
  onSent: () => void;
  onOpenProfile: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const afterRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  const [enterIds, setEnterIds] = useState<string[]>([]);

  function clearPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function openMenu(id: string, x: number, y: number, mine: boolean) {
    window.getSelection()?.removeAllRanges();
    const width = 228;
    const height = 278;
    let left = mine ? x - width + 12 : x - 12;
    let top = y - 64;
    left = Math.min(Math.max(10, left), window.innerWidth - width - 10);
    top = Math.min(Math.max(10, top), window.innerHeight - height - 10);
    setMenu({ id, x: left, y: top });
  }

  async function react(messageId: string, emoji: string) {
    setMenu(null);
    try {
      const response = await fetch("/api/messages/react", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = (await response.json()) as { message?: ChatMessage };
      if (!response.ok || !data.message) return;
      setMessages((current) =>
        current.map((item) => (item.id === data.message!.id ? data.message! : item)),
      );
    } catch {
      /* ignore */
    }
  }

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
          setEnterIds([]);
        } else if (data.messages.length > 0) {
          const incoming = data.messages;
          setEnterIds(incoming.map((item) => item.id));
          setMessages((current) => {
            const seen = new Set(current.map((item) => item.id));
            const fresh = incoming.filter((item) => !seen.has(item.id));
            return fresh.length ? [...current, ...fresh] : current;
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
        body: JSON.stringify({
          peerId: peer.id,
          content,
          replyToId: replyTo?.id,
        }),
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
      setReplyTo(null);
      setEnterIds([data.message.id]);
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
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <button
          className="rounded-xl px-2 py-1 text-sm text-[var(--muted-2)] hover:bg-white/5 md:hidden"
          onClick={onBack}
          type="button"
        >
          ←
        </button>
        <button
          className="flex min-w-0 items-center gap-3 text-left"
          onClick={onOpenProfile}
          type="button"
        >
          <span
            className={`grid size-10 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-[var(--accent)]/30 ${avatarColor(
              peer.nickname,
            )}`}
          >
            {initials(peer.nickname)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              <RichText text={peer.nickname} />
            </p>
            <p className="text-[11px] text-[var(--muted-2)]">профиль</p>
          </div>
        </button>
      </header>

      <div
        className="chat-wallpaper scrollbar-thin flex-1 space-y-2 overflow-y-auto px-4 py-4"
        onClick={() => setMenu(null)}
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted-2)]">
            Напишите первое сообщение
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === me.userId;
            const enter = enterIds.includes(message.id);
            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"} ${
                  enter ? (mine ? "msg-enter-mine" : "msg-enter-theirs") : ""
                }`}
              >
                <div
                  className={`no-select max-w-[78%] rounded-[1.4rem] px-4 py-2.5 shadow-[0_10px_28px_-18px_rgba(0,0,0,0.8)] ${
                    mine
                      ? "rounded-br-md bg-accent text-on-accent"
                      : "rounded-bl-md bg-[var(--bubble-in)]"
                  }`}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openMenu(message.id, event.clientX, event.clientY, mine);
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse" && event.button !== 0) return;
                    clearPress();
                    pressStart.current = { x: event.clientX, y: event.clientY };
                    const x = event.clientX;
                    const y = event.clientY;
                    pressTimer.current = window.setTimeout(() => {
                      window.getSelection()?.removeAllRanges();
                      openMenu(message.id, x, y, mine);
                    }, 430);
                  }}
                  onPointerUp={clearPress}
                  onPointerCancel={clearPress}
                  onPointerMove={(event) => {
                    const dx = event.clientX - pressStart.current.x;
                    const dy = event.clientY - pressStart.current.y;
                    if (dx * dx + dy * dy > 100) clearPress();
                  }}
                >
                  {message.replyTo ? (
                    <div
                      className={`mb-2 rounded-xl border-l-2 px-2 py-1 text-xs ${
                        mine
                          ? "border-[var(--on-accent)]/50 bg-black/10"
                          : "border-[var(--accent)] bg-black/20"
                      }`}
                    >
                      <p className="font-medium">
                        <RichText text={message.replyTo.nickname} />
                      </p>
                      <p className="truncate opacity-80">
                        <RichText text={message.replyTo.content} />
                      </p>
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    <RichText text={message.content} />
                  </p>
                  <p className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-[var(--muted-2)]"}`}>
                    {formatTime(message.createdAt)}
                  </p>
                  {message.reactions?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {message.reactions.map((reaction) => (
                        <span
                          key={reaction.emoji}
                          className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                            reaction.mine
                              ? "bg-white/25"
                              : mine
                                ? "bg-black/10"
                                : "bg-black/20"
                          }`}
                        >
                          <AppleEmoji emoji={reaction.emoji} />
                          {reaction.count > 1 ? ` ${reaction.count}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {menu ? (
        <div className="menu-overlay fixed inset-0 z-40" onClick={() => setMenu(null)}>
          <div
            className="glass-menu menu-pop absolute overflow-hidden rounded-2xl py-1"
            onClick={(event) => event.stopPropagation()}
            style={{ left: menu.x, top: menu.y }}
          >
            <div className="flex justify-between gap-0.5 px-1.5 pt-1.5 pb-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="grid size-7 place-items-center rounded-full text-[15px] hover:bg-white/10"
                  onClick={() => void react(menu.id, emoji)}
                  type="button"
                >
                  <AppleEmoji emoji={emoji} />
                </button>
              ))}
            </div>
            <div className="mx-2 h-px bg-white/10" />
            <button
              className="block w-full px-3.5 py-2 text-left text-[13px] hover:bg-white/10"
              onClick={() => {
                const target = messages.find((item) => item.id === menu.id);
                if (target) setReplyTo(target);
                setMenu(null);
              }}
              type="button"
            >
              Ответить
            </button>
            <button
              className="block w-full px-3.5 py-2 text-left text-[13px] hover:bg-white/10"
              onClick={async () => {
                const target = messages.find((item) => item.id === menu.id);
                if (target) await navigator.clipboard.writeText(target.content);
                setMenu(null);
              }}
              type="button"
            >
              Копировать
            </button>
          </div>
        </div>
      ) : null}

      <form className="border-t border-[var(--border)] p-3" onSubmit={(event) => void send(event)}>
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-accent-soft">
                Ответ {replyTo.senderId === me.userId ? "себе" : peer.nickname}
              </p>
              <p className="truncate text-xs text-[var(--muted-2)]">
                <RichText text={replyTo.content} />
              </p>
            </div>
            <button
              className="shrink-0 text-xs text-[var(--muted-2)]"
              onClick={() => setReplyTo(null)}
              type="button"
            >
              Снять
            </button>
          </div>
        ) : null}
        {error ? <p className="mb-2 px-1 text-xs text-red-300">{error}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            className="max-h-36 min-h-12 flex-1 resize-none rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={replyTo ? "Напишите ответ" : `Сообщение для ${peer.nickname}`}
            rows={1}
            value={draft}
          />
          <button
            className="hover-accent rounded-full bg-accent px-4 py-3 text-sm font-semibold text-on-accent disabled:opacity-50"
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
