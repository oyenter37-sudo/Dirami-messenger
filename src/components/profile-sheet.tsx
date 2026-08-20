"use client";

import { useEffect, useState } from "react";
import { avatarColor, initials } from "@/lib/avatar";
import type { PublicUser } from "@/lib/types";

type Props = {
  userId: string;
  fallback?: Pick<PublicUser, "nickname" | "bio">;
  onClose: () => void;
};

export function ProfileSheet({ userId, fallback, onClose }: Props) {
  const [user, setUser] = useState<PublicUser | null>(
    fallback
      ? { id: userId, nickname: fallback.nickname, bio: fallback.bio }
      : null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/users/${userId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user?: PublicUser }) => {
        if (!cancelled && data.user) setUser(data.user);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const nickname = user?.nickname ?? fallback?.nickname ?? "…";
  const bio = user?.bio ?? fallback?.bio ?? "";

  return (
    <div className="absolute inset-0 z-20 flex bg-black/50 p-3" onClick={onClose}>
      <section
        className="m-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-14 place-items-center rounded-full text-lg font-semibold text-white ${avatarColor(
                nickname,
              )}`}
            >
              {initials(nickname)}
            </span>
            <div>
              <p className="text-lg font-semibold">{nickname}</p>
              <p className="text-xs text-[var(--muted-2)]">профиль</p>
            </div>
          </div>
          <button
            className="rounded-xl px-2 py-1 text-sm text-[var(--muted-2)] hover:bg-white/5"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </header>

        <div className="space-y-5 px-5 pb-6">
          <section>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">
              Ник
            </h2>
            <p className="text-sm">{nickname}</p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">
              Описание
            </h2>
            <p className="text-sm text-[var(--muted-2)]">
              {bio.trim() ? bio : "Пока без описания"}
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">
              NFT
            </h2>
            <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
              <p className="text-sm text-[var(--muted-2)]">Пока пусто</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
