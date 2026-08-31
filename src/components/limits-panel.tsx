"use client";

import { useEffect, useState } from "react";
import { RowsSkeleton } from "@/components/skeletons";
import {
  USER_LIMIT_DEFINITIONS,
  type UserLimitKey,
  type UserLimits,
} from "@/lib/limit-config";
import type { UserSearchResult } from "@/lib/types";

type Usage = Record<UserLimitKey, { used: number; resetAt: number | null }>;

type LimitsData = {
  limits: UserLimits;
  usage: Usage;
  system: { registrationsPerMinute: number };
  isAdmin: boolean;
  admin: UserSearchResult | null;
};

type Props = {
  onClose: () => void;
  onMessageAdmin: (admin: UserSearchResult) => void;
};

export function LimitsPanel({ onClose, onMessageAdmin }: Props) {
  const [data, setData] = useState<LimitsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/limits", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as LimitsData & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Не удалось загрузить лимиты");
        if (!cancelled) setData(payload);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Ошибка сети");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              Защита от спама
            </p>
            <h2 className="mt-0.5 text-xl font-black">Dirami Limits</h2>
          </div>
          <button
            aria-label="Закрыть лимиты"
            className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl text-[var(--muted)] hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="rounded-[1.6rem] border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent-muted),var(--panel))] p-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-xl font-black text-on-accent">
              L
            </span>
            <h3 className="mt-4 text-lg font-black">Ваши ограничения</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-2)]">
              Лимиты защищают Dirami от ботов, массовых рассылок и перегрузки.
              Они считаются на сервере и не зависят от устройства.
            </p>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : !data ? (
            <div className="mt-5">
              <RowsSkeleton count={5} />
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-2.5">
                {USER_LIMIT_DEFINITIONS.filter((item) => item.userVisible).map(
                  (item) => {
                    const limit = data.limits[item.key];
                    const used = data.usage[item.key]?.used ?? 0;
                    const percent =
                      limit <= 0
                        ? 100
                        : Math.min(100, Math.round((used / limit) * 100));
                    return (
                      <article
                        className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--panel)] px-4 py-3.5"
                        key={item.key}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-extrabold">
                              {item.label}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[var(--muted-2)]">
                              Период: {item.period}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black">
                              {used}{" "}
                              <span className="text-[var(--muted-2)]">
                                / {limit}
                              </span>
                            </p>
                            <p className="text-[9px] text-[var(--muted-2)]">
                              использовано
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/25">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 90
                                ? "bg-red-400"
                                : percent >= 65
                                  ? "bg-amber-300"
                                  : "bg-accent"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </article>
                    );
                  },
                )}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4">
                <p className="text-[11px] font-extrabold tracking-wide text-[var(--muted-2)] uppercase">
                  Общесистемная защита
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">
                      Регистрации с одного адреса
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                      Защита от массовых аккаунтов
                    </p>
                  </div>
                  <span className="rounded-full bg-accent-muted px-3 py-1.5 text-xs font-black text-accent-soft">
                    {data.system.registrationsPerMinute}/мин
                  </span>
                </div>
              </div>

              {!data.isAdmin ? (
                <div className="mt-6 rounded-[1.75rem] border border-[var(--accent)]/25 bg-accent-muted p-5">
                  <h3 className="text-base font-black">
                    Нужны увеличенные лимиты?
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                    Напишите администратору и объясните, зачем вам нужны
                    дополнительные возможности. Изменение лимитов бесплатное.
                  </p>
                  <button
                    className="hover-accent mt-4 w-full rounded-full bg-accent py-3 text-sm font-black text-on-accent disabled:opacity-50"
                    disabled={!data.admin}
                    onClick={() => data.admin && onMessageAdmin(data.admin)}
                    type="button"
                  >
                    Написать Mara
                  </button>
                  {!data.admin ? (
                    <p className="mt-2 text-center text-[10px] text-[var(--muted-2)]">
                      Администратор временно недоступен
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                  Вы администратор. Индивидуальные лимиты пользователей доступны
                  в настройках.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
