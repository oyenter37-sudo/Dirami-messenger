"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedName } from "@/components/verified-name";
import {
  USER_LIMIT_DEFINITIONS,
  type UserLimitKey,
  type UserLimits,
} from "@/lib/limit-config";

type AdminUser = {
  id: string;
  nickname: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  limits: UserLimits;
};

export function AdminUserLimits() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [nickname, setNickname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const clean = query.trim();
    if (!clean) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/admin/users?q=${encodeURIComponent(clean)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as {
          users?: AdminUser[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Ошибка поиска");
        setUsers(data.users ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(error instanceof Error ? error.message : "Ошибка сети");
          setUsers([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function pick(user: AdminUser) {
    setSelected(user);
    setNickname(user.nickname);
    setDisplayName(user.displayName || user.nickname);
    setIsVerified(user.isVerified);
    setLimits({ ...user.limits });
    setMessage("");
  }

  function changeLimit(key: UserLimitKey, value: string) {
    if (!limits) return;
    setLimits({ ...limits, [key]: Number(value) });
  }

  async function save() {
    if (!selected || !limits || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname, displayName, isVerified, limits }),
      });
      const data = (await response.json()) as {
        user?: AdminUser;
        error?: string;
      };
      if (!response.ok || !data.user) {
        setMessage(data.error ?? "Не удалось сохранить");
        return;
      }
      setSelected(data.user);
      setUsers((current) =>
        current.map((user) => (user.id === data.user!.id ? data.user! : user)),
      );
      setNickname(data.user.nickname);
      setDisplayName(data.user.displayName);
      setIsVerified(data.user.isVerified);
      setLimits({ ...data.user.limits });
      setMessage("Пользователь, галочка и лимиты обновлены");
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-amber-300/20 bg-[var(--panel)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-lg text-amber-200">
          ⚙
        </span>
        <div>
          <p className="text-[13px] font-extrabold">
            Пользователи и индивидуальные лимиты
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--muted-2)]">
            Только для администратора. Значение 0 полностью запрещает
            соответствующее действие.
          </p>
        </div>
      </div>

      <input
        className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm"
        onChange={(event) => {
          setQuery(event.target.value);
          setMessage("");
        }}
        placeholder="Имя или @username"
        value={query}
      />

      {query.trim() ? (
        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
          {searching ? (
            <p className="px-2 py-4 text-center text-xs text-[var(--muted-2)]">
              Поиск…
            </p>
          ) : users.length ? (
            users.map((user) => (
              <button
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
                  selected?.id === user.id
                    ? "bg-accent-muted"
                    : "hover:bg-white/5"
                }`}
                key={user.id}
                onClick={() => pick(user)}
                type="button"
              >
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  className="size-9 rounded-full text-xs"
                  nickname={user.displayName || user.nickname}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <VerifiedName
                      isVerified={user.isVerified}
                      name={user.displayName || user.nickname}
                      truncate
                    />
                    {user.isAdmin ? (
                      <span className="shrink-0 text-[9px] text-amber-200">
                        admin
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--muted-2)]">
                    @{user.nickname}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-4 text-center text-xs text-[var(--muted-2)]">
              Никого не найдено
            </p>
          )}
        </div>
      ) : null}

      {selected && limits ? (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-bold text-[var(--muted-2)]">
                Имя
              </span>
              <input
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                maxLength={40}
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-bold text-[var(--muted-2)]">
                Юзернейм
              </span>
              <div className="flex items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3">
                <span className="text-sm text-[var(--muted-2)]">@</span>
                <input
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm"
                  maxLength={24}
                  onChange={(event) =>
                    setNickname(event.target.value.replace(/^@/, ""))
                  }
                  value={nickname}
                />
              </div>
            </label>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-sky-400/25 bg-sky-400/5 px-3.5 py-3">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-sky-200">
                Галочка верификации
                <VerifiedName isVerified name="Пример" />
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-[var(--muted-2)]">
                Имя пользователя будет подсвечено синим во всём Dirami
              </span>
            </span>
            <input
              checked={isVerified}
              className="size-5 shrink-0 accent-sky-400"
              onChange={(event) => setIsVerified(event.target.checked)}
              type="checkbox"
            />
          </label>

          <p className="mt-6 mb-2 text-[10px] font-extrabold tracking-[0.13em] text-[var(--muted-2)] uppercase">
            Все доступные лимиты
          </p>
          <div className="space-y-2">
            {USER_LIMIT_DEFINITIONS.filter(
              (item) => item.key !== "nftMintsPerHour" || selected.isAdmin,
            ).map((item) => (
              <label
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
                key={item.key}
              >
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold">
                    {item.label}
                  </span>
                  <span className="block text-[9px] text-[var(--muted-2)]">
                    за: {item.period}
                  </span>
                </span>
                <input
                  className="w-24 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-2 py-2 text-right text-sm font-bold"
                  max={item.max}
                  min={0}
                  onChange={(event) =>
                    changeLimit(item.key, event.target.value)
                  }
                  type="number"
                  value={limits[item.key]}
                />
              </label>
            ))}
          </div>

          <button
            className="hover-accent mt-4 w-full rounded-full bg-accent py-3 text-sm font-extrabold text-on-accent disabled:opacity-50"
            disabled={saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? "Сохраняем…" : "Сохранить профиль, галочку и лимиты"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p
          className={`mt-3 text-xs ${message.includes("обновлены") ? "text-emerald-300" : "text-red-300"}`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
