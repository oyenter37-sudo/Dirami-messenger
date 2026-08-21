"use client";

import { useEffect, useState } from "react";
import { avatarColor, initials } from "@/lib/avatar";
import { RichText } from "@/components/rich-text";
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
    <div
      className="overlay-in absolute inset-0 z-20 flex items-end justify-center bg-black/55 p-3 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <section
        className="profile-in relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-28 bg-[linear-gradient(135deg,var(--accent),var(--accent-soft))]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,#ffffff55,transparent_46%)]" />
          <button
            className="absolute top-3 right-3 rounded-full bg-black/25 px-3 py-1 text-xs text-white/90 backdrop-blur-md hover:bg-black/40"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </div>

        <div className="px-6 pb-6">
          <span
            className={`-mt-10 mb-3 grid size-[4.5rem] place-items-center rounded-full border-4 border-[var(--panel)] text-xl font-semibold text-white shadow-lg ${avatarColor(
              nickname,
            )}`}
          >
            {initials(nickname)}
          </span>

          <p className="text-2xl font-semibold tracking-tight">
            <RichText text={nickname} />
          </p>
          <p className="mt-0.5 text-xs tracking-wide text-[var(--muted-2)] uppercase">
            профиль
          </p>

          <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--bg)]/70 px-4 py-3">
            <p className="mb-1 text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
              Описание
            </p>
            <p className="text-sm leading-6">
              {bio.trim() ? <RichText text={bio} /> : "Пока без описания"}
            </p>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-[var(--muted-2)] uppercase">
              NFT
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="grid aspect-square place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)]/40"
                >
                  <span className="text-[11px] text-[var(--muted-2)]">пусто</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
