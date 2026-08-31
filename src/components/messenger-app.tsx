"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AccountDrawer } from "@/components/account-drawer";
import { LimitsPanel } from "@/components/limits-panel";
import { NewsPanel } from "@/components/news-panel";
import { NftDetailsModal } from "@/components/nft-details-modal";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedName } from "@/components/verified-name";
import { ProfileSheet } from "@/components/profile-sheet";
import { SettingsPanel } from "@/components/settings-panel";
import { AppleEmoji } from "@/components/apple-emoji";
import { RichText } from "@/components/rich-text";
import { VoiceMessagePlayer } from "@/components/voice-message-player";
import { VoiceRecorder } from "@/components/voice-recorder";
import { HYPER_REACTIONS, REACTIONS } from "@/lib/reactions";
import { playMessageSound, unlockMessageSounds } from "@/lib/message-sounds";
import type {
  ChatMessage,
  ChatPreview,
  ChatState,
  HyperVerificationAppearance,
  PublicUser,
  SessionUser,
  UserSearchResult,
} from "@/lib/types";

type Props = {
  me: SessionUser;
  initialProfileId?: string | null;
  initialNftId?: string | null;
  initialPeerId?: string | null;
  initialNewsOpen?: boolean;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function formatListTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return formatTime(iso);
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  const sameYear = date.getFullYear() === now.getFullYear();
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}${sameYear ? "" : ` ${String(date.getFullYear()).slice(2)}`}`;
}

function DoubleCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="double-check"
      fill="none"
      height="11"
      viewBox="0 0 19 13"
      width="15"
    >
      <path
        d="M1.2 7.4 4.7 10.8 11.2 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.4 7.4 11.9 10.8 18.2 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const QUICK_EMOJIS = [
  "😀",
  "😂",
  "🥲",
  "😍",
  "😎",
  "🤔",
  "😐",
  "😴",
  "🥳",
  "😭",
  "😤",
  "😡",
  "👍",
  "👎",
  "🙏",
  "👏",
  "💪",
  "🤝",
  "🔥",
  "✨",
  "🎉",
  "❤️",
  "💔",
  "💯",
] as const;

function previewText(content: string) {
  return content.length > 42 ? `${content.slice(0, 42)}…` : content;
}

function formatVoiceDuration(durationMs: number | null) {
  if (!durationMs) return "0:00";
  const seconds = Math.max(0, Math.ceil(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function messagePreview(message: ChatPreview["lastMessage"]) {
  if (!message) return "";
  if (message.kind === "voice") {
    return message.voiceListenedAt
      ? "🎤 Голосовое · Прослушано"
      : `🎤 Голосовое · ${formatVoiceDuration(message.voiceDurationMs)}`;
  }
  return previewText(message.content);
}

function messageDateLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Сегодня";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function stateLabel(state: ChatState) {
  if (state === "pending_in") return "Входящий запрос";
  if (state === "pending_out") return "Запрос отправлен";
  if (state === "blocked") return "Запрос отклонён";
  if (state === "accepted") return "В ваших чатах";
  return "Можно написать";
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type SidebarItem = UserSearchResult & {
  lastMessage: ChatPreview["lastMessage"];
  unread: number;
};

type VerificationChangedDetail = Partial<HyperVerificationAppearance> & {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isHyperVerified: boolean;
};

export function MessengerApp({
  me,
  initialProfileId,
  initialNftId,
  initialPeerId,
  initialNewsOpen,
}: Props) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [openedUser, setOpenedUser] = useState<UserSearchResult | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(Boolean(initialNewsOpen));
  const [newsUnread, setNewsUnread] = useState(0);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [myDisplayName, setMyDisplayName] = useState(
    me.displayName || me.nickname,
  );
  const [myAvatarUrl, setMyAvatarUrl] = useState(me.avatarUrl ?? "");
  const [myIsVerified, setMyIsVerified] = useState(Boolean(me.isVerified));
  const [myIsHyperVerified, setMyIsHyperVerified] = useState(
    Boolean(me.isHyperVerified),
  );
  const [myHyperAppearance, setMyHyperAppearance] = useState<
    Partial<HyperVerificationAppearance>
  >({
    hyperBadgeStyle: me.hyperBadgeStyle,
    hyperBadgeColor: me.hyperBadgeColor,
    hyperNameStyle: me.hyperNameStyle,
    hyperNameColor: me.hyperNameColor,
    hyperNameGlow: me.hyperNameGlow,
  });
  const [profileId, setProfileId] = useState<string | null>(
    initialProfileId ?? null,
  );
  const [nftId, setNftId] = useState<string | null>(initialNftId ?? null);
  const lastMessageByPeerRef = useRef<Map<string, string>>(new Map());
  const chatsReadyRef = useRef(false);

  const selectedChat = chats.find((chat) => chat.user.id === peerId) ?? null;
  const selected =
    selectedChat ?? (openedUser?.user.id === peerId ? openedUser : null);
  const currentMe = useMemo<SessionUser>(
    () => ({
      ...me,
      ...myHyperAppearance,
      displayName: myDisplayName,
      avatarUrl: myAvatarUrl,
      isVerified: myIsVerified,
      isHyperVerified: myIsHyperVerified,
    }),
    [
      me,
      myAvatarUrl,
      myDisplayName,
      myHyperAppearance,
      myIsHyperVerified,
      myIsVerified,
    ],
  );

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    if (!query.trim()) {
      return chats.map((chat) => ({
        user: chat.user,
        state: chat.state,
        lastMessage: chat.lastMessage,
        unread: chat.unread,
      }));
    }

    return searchResults.map((result) => {
      const chat = chats.find((item) => item.user.id === result.user.id);
      return {
        ...result,
        lastMessage: chat?.lastMessage ?? null,
        unread: chat?.unread ?? 0,
      };
    });
  }, [chats, query, searchResults]);

  const goHome = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  const loadNewsUnread = useCallback(async () => {
    const response = await fetch("/api/news?summary=1", { cache: "no-store" });
    if (response.status === 401) {
      goHome();
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { unreadCount?: number };
    setNewsUnread(Math.max(0, Math.min(50, data.unreadCount ?? 0)));
  }, [goHome]);

  const loadChats = useCallback(async () => {
    const response = await fetch("/api/chats", { cache: "no-store" });
    if (response.status === 401) {
      goHome();
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { chats: ChatPreview[] };

    const nextLastMessages = new Map<string, string>();
    let hasFreshIncoming = false;
    for (const chat of data.chats) {
      if (!chat.lastMessage) continue;
      nextLastMessages.set(chat.user.id, chat.lastMessage.id);
      if (
        chatsReadyRef.current &&
        chat.lastMessage.senderId !== me.userId &&
        lastMessageByPeerRef.current.get(chat.user.id) !== chat.lastMessage.id
      ) {
        hasFreshIncoming = true;
      }
    }
    lastMessageByPeerRef.current = nextLastMessages;
    if (hasFreshIncoming) playMessageSound("receive");
    chatsReadyRef.current = true;
    setChats(data.chats);
  }, [goHome, me.userId]);

  useEffect(() => {
    if (!initialPeerId) return;
    let cancelled = false;
    void fetch(`/api/users/${encodeURIComponent(initialPeerId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          user?: UserSearchResult["user"];
          state?: ChatState;
        };
        if (!response.ok || !data.user || cancelled) return;
        if (data.user.id === me.userId) {
          setProfileId(data.user.id);
          return;
        }
        setOpenedUser({ user: data.user, state: data.state ?? "none" });
        setPeerId(data.user.id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialPeerId, me.userId]);

  useEffect(() => {
    if (initialProfileId || initialNftId || initialPeerId || initialNewsOpen) {
      window.history.replaceState(window.history.state, "", "/chat");
    }
  }, [initialNewsOpen, initialNftId, initialPeerId, initialProfileId]);

  useEffect(() => {
    const updateVerification = (event: Event) => {
      const detail = (event as CustomEvent<VerificationChangedDetail>).detail;
      if (!detail || detail.userId !== me.userId) return;
      if (typeof detail.displayName === "string") {
        setMyDisplayName(detail.displayName || me.nickname);
      }
      if (typeof detail.avatarUrl === "string") {
        setMyAvatarUrl(detail.avatarUrl);
      }
      setMyIsVerified(detail.isVerified);
      setMyIsHyperVerified(detail.isHyperVerified);
      setMyHyperAppearance((current) => ({
        ...current,
        ...(detail.hyperBadgeStyle
          ? { hyperBadgeStyle: detail.hyperBadgeStyle }
          : {}),
        ...(detail.hyperBadgeColor
          ? { hyperBadgeColor: detail.hyperBadgeColor }
          : {}),
        ...(detail.hyperNameStyle
          ? { hyperNameStyle: detail.hyperNameStyle }
          : {}),
        ...(detail.hyperNameColor
          ? { hyperNameColor: detail.hyperNameColor }
          : {}),
        ...(detail.hyperNameGlow
          ? { hyperNameGlow: detail.hyperNameGlow }
          : {}),
      }));
    };

    window.addEventListener("dirami-verification-changed", updateVerification);
    return () =>
      window.removeEventListener(
        "dirami-verification-changed",
        updateVerification,
      );
  }, [me.nickname, me.userId]);

  useEffect(() => {
    const unlock = () => void unlockMessageSounds();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

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
    const timer = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadChats]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        if (!cancelled) await loadNewsUnread();
      } catch {
        /* polling continues */
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadNewsUnread]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(cleanQuery)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { users: UserSearchResult[] };
        setSearchResults(data.users);
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function logout() {
    let subscription: PushSubscription | null = null;
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      subscription =
        (await registration?.pushManager.getSubscription()) ?? null;
    } catch {
      subscription = null;
    }

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pushEndpoint: subscription?.endpoint }),
    });
    if (!response.ok) throw new Error("logout failed");
    if (subscription) await subscription.unsubscribe().catch(() => false);
    goHome();
  }

  function openConversation(item: UserSearchResult) {
    setOpenedUser(item);
    setPeerId(item.user.id);
    setQuery("");
  }

  function openSidebarItem(item: UserSearchResult) {
    if (item.state === "none") {
      setOpenedUser(item);
      setProfileId(item.user.id);
      return;
    }
    openConversation(item);
  }

  async function relationshipChanged(action?: "accept" | "decline") {
    await loadChats();
    if (action === "decline") {
      setPeerId(null);
      setOpenedUser(null);
    }
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-a),transparent_36%)]" />
      <aside
        className={`relative z-10 h-full w-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)] md:w-80 lg:w-96 ${
          peerId ? "hidden md:flex" : "flex"
        }`}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b border-[var(--border)] px-3 py-3.5">
          <button
            aria-label="Открыть мой профиль"
            className="group flex min-w-0 max-w-full items-center gap-2 justify-self-start rounded-2xl p-1 text-left transition hover:bg-white/5"
            onClick={() => setProfileId(me.userId)}
            title="Открыть мой профиль"
            type="button"
          >
            <UserAvatar
              avatarUrl={myAvatarUrl}
              className="size-9 shrink-0 rounded-full text-xs transition group-hover:brightness-110"
              nickname={myDisplayName}
            />
            <span className="min-w-0 text-xs font-extrabold sm:text-sm">
              <VerifiedName
                hyperAppearance={currentMe}
                isHyperVerified={myIsHyperVerified}
                isVerified={myIsVerified}
                name={myDisplayName}
                truncate
              />
            </span>
          </button>

          <p className="px-2 text-center text-[17px] font-extrabold tracking-tight">
            <RichText text="Dirami" />
          </p>

          <button
            aria-label="Открыть меню"
            className="relative grid size-10 shrink-0 place-items-center justify-self-end rounded-full border border-transparent text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-white/5 hover:text-white"
            onClick={() => setAccountOpen(true)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
            {newsUnread > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-4 text-white">
                {newsUnread}
              </span>
            ) : null}
          </button>
        </header>

        <div className="px-3 pt-3">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[linear-gradient(110deg,var(--accent-muted),rgba(255,255,255,.025))] px-4 py-2.5 text-center shadow-[0_12px_30px_-24px_var(--accent)]">
            <span className="pointer-events-none absolute -top-6 -left-4 size-14 rounded-full bg-[var(--accent)]/10 blur-xl" />
            <p className="relative text-xs font-bold tracking-[0.01em] text-[var(--muted)]">
              <RichText text="Dirami v1 – перед вами!" />
            </p>
          </div>
        </div>

        <div className="px-3 py-3">
          <input
            className="w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm placeholder:text-[var(--muted-2)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти пользователя по нику"
            value={query}
          />
        </div>

        <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {searching && query.trim() ? (
            <li className="px-3 py-6 text-sm text-[var(--muted-2)]">Ищем…</li>
          ) : sidebarItems.length === 0 ? (
            <li className="px-5 py-10 text-center">
              <p className="text-sm font-medium">
                {query.trim() ? "Никого не найдено" : "У вас пока нет чатов"}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted-2)]">
                {query.trim()
                  ? "Проверьте ник и попробуйте ещё раз."
                  : "Найдите человека по нику и отправьте ему первое сообщение."}
              </p>
            </li>
          ) : (
            sidebarItems.map((item) => {
              const active = item.user.id === peerId;
              return (
                <li key={item.user.id}>
                  <button
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-accent-muted ring-1 ring-[var(--accent)]/40"
                        : "hover:bg-[var(--accent-muted)]"
                    }`}
                    onClick={() => openSidebarItem(item)}
                    type="button"
                  >
                    <UserAvatar
                      avatarUrl={item.user.avatarUrl}
                      className="size-10 cursor-pointer rounded-full text-sm"
                      nickname={item.user.displayName || item.user.nickname}
                      onClick={(event) => {
                        event.stopPropagation();
                        setProfileId(item.user.id);
                      }}
                      title="Открыть профиль"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 text-sm font-medium">
                          <VerifiedName
                            hyperAppearance={item.user}
                            isHyperVerified={item.user.isHyperVerified}
                            isVerified={item.user.isVerified}
                            name={item.user.displayName || item.user.nickname}
                            truncate
                          />
                        </span>
                        {item.lastMessage ? (
                          <span className="shrink-0 text-[11px] text-[var(--muted-2)]">
                            {formatListTime(item.lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-xs ${item.state === "pending_in" ? "text-accent-soft" : "text-[var(--muted-2)]"}`}
                        >
                          {item.lastMessage ? (
                            <>
                              {item.lastMessage.senderId === me.userId
                                ? "Вы: "
                                : ""}
                              <RichText
                                text={messagePreview(item.lastMessage)}
                              />
                            </>
                          ) : (
                            stateLabel(item.state)
                          )}
                        </span>
                        {item.state === "pending_in" ? (
                          <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold text-accent-soft">
                            Запрос
                          </span>
                        ) : item.unread > 0 ? (
                          <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">
                            {item.unread}
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
        className={`chat-wallpaper relative h-full min-w-0 flex-1 flex-col ${peerId ? "flex" : "hidden md:flex"}`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-accent-muted text-2xl font-semibold text-accent-soft">
              D
            </span>
            <p className="text-lg font-medium">У вас пока нет открытого чата</p>
            <p className="max-w-sm text-sm text-[var(--muted-2)]">
              Найдите пользователя по нику. Первое сообщение станет запросом на
              общение.
            </p>
          </div>
        ) : (
          <Conversation
            key={selected.user.id}
            me={currentMe}
            peer={selected.user}
            initialState={selected.state}
            onBack={() => setPeerId(null)}
            onAuthLost={goHome}
            onSent={() => void loadChats()}
            onRelationshipChanged={(action) => void relationshipChanged(action)}
            onOpenProfile={() => setProfileId(selected.user.id)}
          />
        )}
      </section>

      {accountOpen ? (
        <AccountDrawer
          displayName={myDisplayName}
          hyperAppearance={currentMe}
          isHyperVerified={myIsHyperVerified}
          isVerified={myIsVerified}
          newsUnread={newsUnread}
          nickname={me.nickname}
          onClose={() => setAccountOpen(false)}
          onLogout={logout}
          onOpenNews={() => {
            setAccountOpen(false);
            setNewsOpen(true);
          }}
          onOpenLimits={() => {
            setAccountOpen(false);
            setLimitsOpen(true);
          }}
          onOpenSettings={() => {
            setAccountOpen(false);
            setSettingsOpen(true);
          }}
        />
      ) : null}
      {newsOpen ? (
        <NewsPanel
          onClose={() => setNewsOpen(false)}
          onUnreadChange={setNewsUnread}
        />
      ) : null}
      {limitsOpen ? (
        <LimitsPanel
          onClose={() => setLimitsOpen(false)}
          onMessageAdmin={(admin) => {
            setLimitsOpen(false);
            openConversation(admin);
          }}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsPanel
          hyperAppearance={currentMe}
          isAdmin={Boolean(me.isAdmin)}
          isHyperVerified={myIsHyperVerified}
          isVerified={myIsVerified}
          nickname={me.nickname}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      {nftId ? (
        <NftDetailsModal
          nftId={nftId}
          onClose={() => setNftId(null)}
          onOpenProfile={(user) => {
            setNftId(null);
            setProfileId(user.id);
          }}
        />
      ) : null}
      {profileId ? (
        <ProfileSheet
          key={profileId}
          userId={profileId}
          meId={me.userId}
          fallback={
            chats.find((chat) => chat.user.id === profileId)?.user ??
            (openedUser?.user.id === profileId ? openedUser.user : undefined)
          }
          fallbackState={
            chats.find((chat) => chat.user.id === profileId)?.state ??
            (openedUser?.user.id === profileId ? openedUser.state : "none")
          }
          onClose={() => setProfileId(null)}
          onMessage={(target) => {
            setProfileId(null);
            openConversation(target);
          }}
          onOpenLinkedProfile={(user) => setProfileId(user.id)}
        />
      ) : null}
    </div>
  );
}

function Conversation({
  me,
  peer,
  initialState,
  onBack,
  onAuthLost,
  onSent,
  onRelationshipChanged,
  onOpenProfile,
}: {
  me: SessionUser;
  peer: PublicUser;
  initialState: ChatState;
  onBack: () => void;
  onAuthLost: () => void;
  onSent: () => void;
  onRelationshipChanged: (action?: "accept" | "decline") => void;
  onOpenProfile: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] =
    useState<ChatState>(initialState);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const afterRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const meIdRef = useRef(me.userId);
  const loadingOlderRef = useRef(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(
    null,
  );
  const scrollActionRef = useRef<"restore" | "bottom" | "none">("bottom");
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef({ x: 0, y: 0 });
  const [enterIds, setEnterIds] = useState<string[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    meIdRef.current = me.userId;
  }, [me.userId]);
  const peerName = peer.displayName || peer.nickname;
  const canUseHyperReactions = Boolean(me.isHyperVerified);

  function clearPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function openMenu(id: string, x: number, y: number, mine: boolean) {
    window.getSelection()?.removeAllRanges();
    const width = 228;
    const height = canUseHyperReactions ? 334 : 278;
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
      const data = (await response.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (response.status === 401) {
        onAuthLost();
        return;
      }
      if (!response.ok || !data.message) {
        setError(data.error ?? "Не удалось поставить реакцию");
        return;
      }
      setError("");
      setMessages((current) =>
        current.map((item) =>
          item.id === data.message!.id ? data.message! : item,
        ),
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

        const data = (await response.json()) as {
          messages: ChatMessage[];
          state: ChatState;
          hasMore?: boolean;
        };
        if (cancelled) return;
        setConnectionState(data.state);

        if (!incremental) {
          scrollActionRef.current = "bottom";
          setMessages(data.messages);
          setEnterIds([]);
          setHistoryHasMore(Boolean(data.hasMore));
        } else if (data.messages.length > 0) {
          const incoming = data.messages;
          const cursorTime = after ? new Date(after).getTime() : 0;
          setEnterIds(
            incoming
              .filter((item) => new Date(item.createdAt).getTime() > cursorTime)
              .map((item) => item.id),
          );
          const seenIds = new Set(messagesRef.current.map((item) => item.id));
          const fresh = incoming.filter((item) => !seenIds.has(item.id));
          if (fresh.length > 0) {
            const lastFresh = fresh[fresh.length - 1];
            const container = scrollRef.current;
            const nearBottom = container
              ? container.scrollHeight -
                  container.scrollTop -
                  container.clientHeight <
                220
              : true;
            scrollActionRef.current =
              lastFresh.senderId === meIdRef.current || nearBottom
                ? "bottom"
                : "none";
          }
          setMessages((current) => {
            const updates = new Map(incoming.map((item) => [item.id, item]));
            const merged = current.map((item) => updates.get(item.id) ?? item);
            return [
              ...merged,
              ...incoming.filter((item) => !seenIds.has(item.id)),
            ];
          });
        }

        let latest = afterRef.current;
        for (const item of data.messages) {
          const candidates = [item.createdAt, item.voice?.listenedAt].filter(
            (value): value is string => Boolean(value),
          );
          for (const candidate of candidates) {
            if (!latest || candidate > latest) latest = candidate;
          }
        }
        afterRef.current = latest;
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

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const action = scrollActionRef.current;
    scrollActionRef.current = "none";
    if (action === "restore") {
      const saved = scrollRestoreRef.current;
      scrollRestoreRef.current = null;
      if (saved) {
        container.scrollTop += container.scrollHeight - saved.height;
      }
    } else if (action === "bottom") {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
    requestAnimationFrame(updateScrollState);
  }, [messages.length]);

  function updateScrollState() {
    const container = scrollRef.current;
    if (!container) return;
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distance > 480);
  }

  function scrollToBottom() {
    scrollActionRef.current = "bottom";
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setShowScrollDown(false);
  }

  async function loadOlder() {
    if (loadingOlderRef.current || !historyHasMore) return;
    const oldest = messagesRef.current[0];
    if (!oldest) return;

    const container = scrollRef.current;
    if (container) {
      scrollRestoreRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop,
      };
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const params = new URLSearchParams({
        peerId: peer.id,
        before: oldest.createdAt,
      });
      const response = await fetch(`/api/messages?${params.toString()}`, {
        cache: "no-store",
      });
      if (response.status === 401) {
        onAuthLost();
        return;
      }
      if (!response.ok) {
        scrollRestoreRef.current = null;
        return;
      }
      const data = (await response.json()) as {
        messages?: ChatMessage[];
        hasMore?: boolean;
      };
      if (!data.messages?.length) {
        scrollRestoreRef.current = null;
        setHistoryHasMore(Boolean(data.hasMore));
        return;
      }
      scrollActionRef.current = "restore";
      setMessages((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [
          ...(data.messages ?? []).filter((item) => !seen.has(item.id)),
          ...current,
        ];
      });
      setHistoryHasMore(Boolean(data.hasMore));
    } catch {
      scrollRestoreRef.current = null;
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }

  function addSentMessage(message: ChatMessage, state?: ChatState) {
    setReplyTo(null);
    setEnterIds([message.id]);
    scrollActionRef.current = "bottom";
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current.map((item) => (item.id === message.id ? message : item))
        : [...current, message],
    );
    const cursor = message.voice?.listenedAt ?? message.createdAt;
    if (!afterRef.current || cursor > afterRef.current)
      afterRef.current = cursor;
    if (state) setConnectionState(state);
    playMessageSound("send");
    onSent();
  }

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
      const data = await readJsonResponse<{
        message?: ChatMessage;
        state?: ChatState;
        error?: string;
      }>(response);
      if (!data) {
        setError(`Ошибка сервера (${response.status})`);
        return;
      }
      if (!response.ok || !data.message) {
        setError(data.error ?? "Не отправилось");
        return;
      }

      setDraft("");
      addSentMessage(data.message, data.state);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSending(false);
    }
  }

  async function sendVoice(blob: Blob, durationMs: number) {
    if (sending) return false;
    setSending(true);
    setError("");
    try {
      const type = blob.type.toLowerCase();
      const extension = type.includes("mp4")
        ? "m4a"
        : type.includes("ogg")
          ? "ogg"
          : "webm";
      const form = new FormData();
      form.append("peerId", peer.id);
      form.append("durationMs", String(Math.min(60_000, durationMs)));
      if (replyTo?.id) form.append("replyToId", replyTo.id);
      form.append("audio", blob, `voice.${extension}`);

      const response = await fetch("/api/messages/voice", {
        method: "POST",
        body: form,
      });
      const data = await readJsonResponse<{
        message?: ChatMessage;
        state?: ChatState;
        error?: string;
      }>(response);
      if (response.status === 401) {
        onAuthLost();
        return false;
      }
      if (!data) {
        setError(`Ошибка сервера (${response.status})`);
        return false;
      }
      if (!response.ok || !data.message) {
        setError(data.error ?? "Голосовое сообщение не отправилось");
        return false;
      }

      setVoiceActive(false);
      addSentMessage(data.message, data.state);
      return true;
    } catch {
      setError("Сеть недоступна — запись можно отправить повторно");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleRequest(action: "accept" | "decline") {
    if (requestBusy) return;
    setRequestBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chats/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ peerId: peer.id, action }),
      });
      const data = await readJsonResponse<{
        error?: string;
        state?: ChatState;
      }>(response);
      if (!data) {
        setError(`Ошибка сервера (${response.status})`);
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "Не удалось обработать запрос");
        return;
      }
      setConnectionState(action === "accept" ? "accepted" : "none");
      onRelationshipChanged(action);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setRequestBusy(false);
    }
  }

  function voiceListened(messageId: string, listenedAt: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.voice
          ? {
              ...message,
              voice: {
                ...message.voice,
                listenedAt,
                available: false,
              },
            }
          : message,
      ),
    );
    if (!afterRef.current || listenedAt > afterRef.current) {
      afterRef.current = listenedAt;
    }
    onSent();
  }

  const emptyText =
    connectionState === "blocked"
      ? "Запрос отклонён"
      : connectionState === "pending_out"
        ? "Запрос отправлен"
        : connectionState === "pending_in"
          ? "Входящий запрос на общение"
          : "Напишите первое сообщение";

  return (
    <>
      <header className="chat-header absolute inset-x-0 top-0 z-20 flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <button
          className="rounded-xl px-2 py-1 text-sm text-[var(--muted-2)] transition hover:bg-[var(--accent-muted)] md:hidden"
          onClick={onBack}
          type="button"
        >
          ←
        </button>
        <button
          aria-label={`Открыть профиль ${peerName}`}
          className="flex min-w-0 items-center gap-3 text-left"
          onClick={onOpenProfile}
          title="Открыть профиль"
          type="button"
        >
          <UserAvatar
            avatarUrl={peer.avatarUrl}
            className="size-10 rounded-full text-sm ring-2 ring-[var(--accent)]/30"
            nickname={peerName}
          />
          <div className="min-w-0">
            <p className="min-w-0 text-sm font-semibold">
              <VerifiedName
                hyperAppearance={peer}
                isHyperVerified={peer.isHyperVerified}
                isVerified={peer.isVerified}
                name={peerName}
                truncate
              />
            </p>
            <p
              className={`text-[11px] ${
                connectionState === "accepted"
                  ? "text-accent"
                  : "text-[var(--muted-2)]"
              }`}
            >
              {connectionState === "accepted"
                ? "чат активен"
                : stateLabel(connectionState)}
            </p>
          </div>
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          className="chat-wallpaper scrollbar-thin absolute inset-0 overflow-y-auto px-4 pt-[68px] pb-3 [overflow-anchor:none]"
          onClick={() => setMenu(null)}
          onScroll={(event) => {
            if (event.currentTarget.scrollTop < 80) void loadOlder();
            updateScrollState();
          }}
          ref={scrollRef}
        >
        {historyHasMore ? (
          <div className="flex justify-center py-1">
            <button
              className="rounded-full border border-[var(--border)] bg-[var(--panel)]/85 px-3 py-1 text-[11px] font-semibold text-[var(--muted-2)] transition hover:text-[var(--text)] disabled:opacity-60"
              disabled={loadingOlder}
              onClick={() => void loadOlder()}
              type="button"
            >
              {loadingOlder ? "Загружаем историю…" : "Загрузить ещё"}
            </button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted-2)]">
            {emptyText}
          </p>
        ) : (
          messages.map((message, index) => {
            const mine = message.senderId === me.userId;
            const enter = enterIds.includes(message.id);
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const showDate =
              !previous ||
              new Date(previous.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();
            const dateBeforeNext = next
              ? new Date(next.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString()
              : true;
            const groupedTop =
              !showDate && !!previous && previous.senderId === message.senderId;
            const lastOfGroup =
              !next || next.senderId !== message.senderId || dateBeforeNext;
            const hasReactions = Boolean(message.reactions?.length);
            const isVoice = message.kind === "voice" && message.voice;
            const bubbleBottomPad = hasReactions
              ? "pb-9"
              : isVoice
                ? "pb-7"
                : "pb-2";

            return (
              <div
                className={groupedTop ? "mt-[3px]" : "mt-2"}
                key={message.id}
              >
                {showDate ? (
                  <div className="my-4 flex justify-center first:mt-1">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-1 text-[10px] font-semibold text-[var(--muted-2)] shadow-sm">
                      {messageDateLabel(message.createdAt)}
                    </span>
                  </div>
                ) : null}
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${
                    enter ? (mine ? "msg-enter-mine" : "msg-enter-theirs") : ""
                  }`}
                >
                  <div
                    className={`message-bubble no-select relative min-w-[92px] max-w-[84%] rounded-[1.25rem] border px-3 pt-2 shadow-[0_10px_28px_-20px_rgba(0,0,0,0.9)] sm:max-w-[72%] ${bubbleBottomPad} ${
                      mine
                        ? `message-bubble-mine border-transparent bg-accent text-on-accent ${
                            lastOfGroup ? "rounded-br-[0.4rem]" : "no-tail"
                          }`
                        : `message-bubble-theirs border-[var(--border)] bg-[var(--bubble-in)] ${
                            lastOfGroup ? "rounded-bl-[0.4rem]" : "no-tail"
                          }`
                    }`}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (connectionState === "accepted") {
                        openMenu(
                          message.id,
                          event.clientX,
                          event.clientY,
                          mine,
                        );
                      }
                    }}
                    onPointerDown={(event) => {
                      if (connectionState !== "accepted") return;
                      if (event.pointerType === "mouse" && event.button !== 0)
                        return;
                      clearPress();
                      pressStart.current = {
                        x: event.clientX,
                        y: event.clientY,
                      };
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
                        className={`mb-2 rounded-xl border-l-[3px] px-2.5 py-1.5 text-xs ${
                          mine
                            ? "border-[var(--on-accent)]/45 bg-black/10"
                            : "border-[var(--accent)] bg-black/15"
                        }`}
                      >
                        <p className="text-[11px] font-bold">
                          <VerifiedName
                            hyperAppearance={message.replyTo}
                            isHyperVerified={message.replyTo.isHyperVerified}
                            isVerified={message.replyTo.isVerified}
                            name={message.replyTo.nickname}
                          />
                        </p>
                        <p className="mt-0.5 truncate text-[11px] opacity-70">
                          <RichText
                            text={
                              message.replyTo.kind === "voice"
                                ? `🎤 Голосовое · ${formatVoiceDuration(message.replyTo.voiceDurationMs)}`
                                : message.replyTo.content
                            }
                          />
                        </p>
                      </div>
                    ) : null}
                    {message.kind === "voice" && message.voice ? (
                      <VoiceMessagePlayer
                        messageId={message.id}
                        mine={mine}
                        onListened={voiceListened}
                        voice={message.voice}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.4]">
                        <RichText text={message.content} />
                        {hasReactions ? null : <span className="meta-spacer" />}
                      </p>
                    )}
                    {hasReactions ? (
                      <div className="mt-1.5 flex flex-wrap justify-end gap-1">
                        {message.reactions.map((reaction) => (
                          <span
                            key={reaction.emoji}
                            className={`rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm ${
                              reaction.mine
                                ? "border-white/25 bg-white/20"
                                : "border-black/10 bg-black/10"
                            }`}
                          >
                            <AppleEmoji emoji={reaction.emoji} />
                            {reaction.count > 1 ? ` ${reaction.count}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div
                      className={`bubble-meta ${
                        mine
                          ? "text-on-accent opacity-75"
                          : "text-[var(--muted-2)]"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {mine ? <DoubleCheckIcon /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
        </div>

        {showScrollDown ? (
          <button
            aria-label="Пролистать вниз"
            className="chat-header absolute bottom-3 right-4 z-10 grid size-10 place-items-center rounded-full border border-[var(--border)] text-[var(--muted)] shadow-lg transition hover:text-accent"
            onClick={scrollToBottom}
            title="Вниз"
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="18"
              viewBox="0 0 24 24"
              width="18"
            >
              <path
                d="M12 4.5v15m0 0 6.2-6.2M12 19.5 5.8 13.3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.9"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {menu ? (
        <div
          className="menu-overlay no-select fixed inset-0 z-40"
          onClick={() => setMenu(null)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="glass-menu menu-pop no-select absolute touch-manipulation overflow-hidden rounded-2xl py-1"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
            style={{ left: menu.x, top: menu.y }}
          >
            <div className="grid grid-cols-7 gap-0.5 px-1.5 pt-1.5 pb-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="grid size-7 place-items-center rounded-full text-[15px] transition hover:bg-[var(--accent-muted)]"
                  onClick={() => void react(menu.id, emoji)}
                  title="Реакция"
                  type="button"
                >
                  <AppleEmoji emoji={emoji} />
                </button>
              ))}
            </div>
            {canUseHyperReactions ? (
              <div className="border-t border-fuchsia-300/12 bg-[linear-gradient(110deg,rgba(244,114,182,.06),rgba(56,189,248,.05),rgba(250,204,21,.05))] px-1.5 pt-1 pb-1.5">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[8px] font-black tracking-[0.12em] text-fuchsia-200/75 uppercase">
                    Гиперреакции
                  </span>
                  <span className="hyper-verified-badge text-[9px]">
                    <span aria-hidden="true">✓</span>
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {HYPER_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      className="grid size-7 place-items-center rounded-full bg-fuchsia-400/8 text-[15px] shadow-[inset_0_0_10px_rgba(217,70,239,.12)] hover:bg-fuchsia-300/15"
                      onClick={() => void react(menu.id, emoji)}
                      title="Гиперреакция"
                      type="button"
                    >
                      <AppleEmoji emoji={emoji} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mx-2 h-px bg-white/10" />
            <button
              className="block w-full px-3.5 py-2 text-left text-[13px] transition hover:bg-[var(--accent-muted)]"
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
              className="block w-full px-3.5 py-2 text-left text-[13px] transition hover:bg-[var(--accent-muted)]"
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

      {connectionState === "pending_in" ? (
        <div className="border-t border-[var(--border)] bg-[var(--panel)]/80 p-4">
          <p className="text-sm font-semibold">
            {peerName} хочет начать общение
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-2)]">
            Примите запрос, чтобы вы оба могли отправлять сообщения, или
            отклоните его.
          </p>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
              disabled={requestBusy}
              onClick={() => void handleRequest("decline")}
              type="button"
            >
              Отклонить
            </button>
            <button
              className="hover-accent flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent disabled:opacity-50"
              disabled={requestBusy}
              onClick={() => void handleRequest("accept")}
              type="button"
            >
              Принять
            </button>
          </div>
        </div>
      ) : connectionState === "pending_out" ? (
        <div className="border-t border-[var(--border)] bg-[var(--panel)]/80 px-5 py-4 text-center">
          <p className="text-sm font-semibold">Запрос отправлен</p>
          <p className="mt-1 text-xs text-[var(--muted-2)]">
            Можно будет писать дальше, когда {peerName} примет запрос.
          </p>
        </div>
      ) : connectionState === "blocked" ? (
        <div className="border-t border-[var(--border)] bg-[var(--panel)]/80 px-5 py-4 text-center">
          <p className="text-sm font-semibold">Запрос отклонён</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-2)]">
            Вы не можете написать снова. Теперь {peerName} сможет отправить вам
            новый запрос первым.
          </p>
        </div>
      ) : (
        <form
          className="border-t border-[var(--border)] bg-[var(--panel)]/60 p-2.5 sm:px-4 sm:py-3"
          onSubmit={(event) => void send(event)}
        >
          {connectionState === "none" ? (
            <p className="mb-2 px-1 text-xs leading-5 text-[var(--muted-2)]">
              Можно отправить одно сообщение. Остальные станут доступны после
              принятия запроса.
            </p>
          ) : null}
          {replyTo ? (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-accent-soft">
                  Ответ {replyTo.senderId === me.userId ? "себе" : peerName}
                </p>
                <p className="truncate text-xs text-[var(--muted-2)]">
                  <RichText
                    text={
                      replyTo.kind === "voice"
                        ? `🎤 Голосовое · ${formatVoiceDuration(replyTo.voice?.durationMs ?? null)}`
                        : replyTo.content
                    }
                  />
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
          {error ? (
            <p className="mb-2 px-1 text-xs text-red-300">{error}</p>
          ) : null}
          <div className="flex items-end gap-2">
            {voiceActive ? (
              <VoiceRecorder
                key="voice-recorder"
                disabled={sending}
                onActiveChange={setVoiceActive}
                onError={setError}
                onSend={sendVoice}
              />
            ) : (
              <>
                <div className="relative flex min-w-0 flex-1 items-end rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg)] pr-1 transition focus-within:border-[var(--accent)]/55">
                  <button
                    aria-label="Выбрать эмодзи"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[17px] transition hover:bg-[var(--accent-muted)]"
                    onClick={() => setEmojiOpen((value) => !value)}
                    title="Эмодзи"
                    type="button"
                  >
                    <AppleEmoji emoji="😊" />
                  </button>
                  {emojiOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setEmojiOpen(false)}
                      />
                      <div className="glass-menu menu-pop absolute bottom-[calc(100%+8px)] left-0 z-40 w-[252px] rounded-2xl p-2">
                        <div className="grid grid-cols-8 gap-0.5">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              className="grid size-7 place-items-center rounded-full text-[16px] transition hover:bg-[var(--accent-muted)]"
                              key={emoji}
                              onClick={() =>
                                setDraft((current) => current + emoji)
                              }
                              title="Добавить в сообщение"
                              type="button"
                            >
                              <AppleEmoji emoji={emoji} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                  <textarea
                    className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px]"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={
                      connectionState === "none"
                        ? `Первое сообщение для ${peerName}`
                        : replyTo
                          ? "Напишите ответ"
                          : `Сообщение для ${peerName}`
                    }
                    rows={1}
                    value={draft}
                  />
                </div>
                {draft.trim() ? (
                  <button
                    aria-label="Отправить"
                    className="hover-accent grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-[0_10px_24px_-12px_var(--accent)] transition disabled:opacity-50"
                    disabled={sending}
                    title={connectionState === "none" ? "Отправить запрос" : "Отправить"}
                    type="submit"
                  >
                    <svg
                      aria-hidden="true"
                      fill="currentColor"
                      height="19"
                      viewBox="0 0 24 24"
                      width="19"
                    >
                      <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                    </svg>
                  </button>
                ) : (
                  <VoiceRecorder
                    key="voice-recorder"
                    disabled={sending}
                    onActiveChange={setVoiceActive}
                    onError={setError}
                    onSend={sendVoice}
                  />
                )}
              </>
            )}
          </div>
        </form>
      )}
    </>
  );
}
