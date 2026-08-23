"use client";

import { useEffect, useMemo, useState } from "react";

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-zа-я]/u.test(password) && /[A-ZА-Я]/u.test(password)) score += 1;
  if (/\d/.test(password) && /[^\p{L}\p{N}]/u.test(password)) score += 1;
  return score;
}

export function BackupPasswordSettings() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/password", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { hasPassword?: boolean };
        if (cancelled) return;
        const exists = Boolean(data.hasPassword);
        setHasPassword(exists);
        setExpanded(!exists);
      })
      .catch(() => {
        if (!cancelled) setMessage("Не удалось проверить резервный пароль");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function clearForm() {
    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
  }

  async function savePassword() {
    setMessage("");
    setSuccess(false);
    if (newPassword.length < 8) {
      setMessage("Пароль должен содержать минимум 8 символов");
      return;
    }
    if (newPassword !== repeatPassword) {
      setMessage("Новые пароли не совпадают");
      return;
    }
    if (hasPassword && !currentPassword) {
      setMessage("Введите текущий резервный пароль");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as {
        error?: string;
        hasPassword?: boolean;
      };
      if (!response.ok) {
        setMessage(data.error ?? "Не удалось сохранить пароль");
        return;
      }
      const wasCreated = !hasPassword;
      setHasPassword(true);
      setExpanded(false);
      setSuccess(true);
      setMessage(
        wasCreated ? "Резервный пароль создан" : "Резервный пароль обновлён",
      );
      clearForm();
    } catch {
      setMessage("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--panel)]">
      <div className="relative p-4">
        <div className="pointer-events-none absolute -top-14 -right-12 size-32 rounded-full bg-[var(--accent)]/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent)]/20 bg-accent-muted text-accent-soft">
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M7.5 10V7.8a4.5 4.5 0 0 1 9 0V10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
              <rect
                height="10"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.8"
                width="15"
                x="4.5"
                y="10"
              />
              <path
                d="M12 14v2.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold">Резервный пароль</p>
              {hasPassword === null ? (
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-[var(--muted-2)]">
                  Проверяем…
                </span>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    hasPassword
                      ? "bg-emerald-400/10 text-emerald-200"
                      : "bg-amber-400/10 text-amber-200"
                  }`}
                >
                  {hasPassword ? "Установлен" : "Не установлен"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-[var(--muted-2)]">
              Вход в Dirami выполняется через Google. Этот пароль хранится как
              дополнительный резервный секрет аккаунта.
            </p>
          </div>
        </div>

        {hasPassword && !expanded ? (
          <button
            className="relative mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--accent)]/40 hover:bg-white/5"
            onClick={() => {
              setExpanded(true);
              setMessage("");
              setSuccess(false);
            }}
            type="button"
          >
            Изменить резервный пароль
          </button>
        ) : null}

        {expanded ? (
          <div className="relative mt-4 space-y-2.5">
            {hasPassword ? (
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm focus:border-[var(--accent)]"
                maxLength={72}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Текущий резервный пароль"
                type="password"
                value={currentPassword}
              />
            ) : null}
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm focus:border-[var(--accent)]"
              maxLength={72}
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={
                hasPassword ? "Новый резервный пароль" : "Придумайте пароль"
              }
              type="password"
              value={newPassword}
            />
            {newPassword ? (
              <div className="flex gap-1 px-1" aria-label="Надёжность пароля">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={`h-1 flex-1 rounded-full transition ${
                      strength >= level
                        ? strength >= 3
                          ? "bg-emerald-400"
                          : "bg-amber-400"
                        : "bg-white/8"
                    }`}
                  />
                ))}
              </div>
            ) : null}
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm focus:border-[var(--accent)]"
              maxLength={72}
              minLength={8}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder="Повторите новый пароль"
              type="password"
              value={repeatPassword}
            />
            <div className="flex gap-2 pt-1">
              {hasPassword ? (
                <button
                  className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm font-semibold hover:bg-white/5"
                  disabled={pending}
                  onClick={() => {
                    setExpanded(false);
                    setMessage("");
                    clearForm();
                  }}
                  type="button"
                >
                  Отмена
                </button>
              ) : null}
              <button
                className="hover-accent flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent disabled:opacity-50"
                disabled={pending || !newPassword || !repeatPassword}
                onClick={() => void savePassword()}
                type="button"
              >
                {pending
                  ? "Сохраняем…"
                  : hasPassword
                    ? "Обновить"
                    : "Создать пароль"}
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <p
            className={`relative mt-3 rounded-xl px-3 py-2 text-xs ${
              success
                ? "bg-emerald-400/8 text-emerald-200"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
