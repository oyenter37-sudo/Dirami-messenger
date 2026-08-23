"use client";

import { useRouter } from "next/navigation";
import { NftDetailsModal } from "@/components/nft-details-modal";
import { ProfileSheet } from "@/components/profile-sheet";
import type { NftPerson, PublicUser } from "@/lib/types";

type ProfilePreview = Pick<
  PublicUser,
  | "id"
  | "nickname"
  | "displayName"
  | "bio"
  | "extraProfile"
  | "avatarUrl"
  | "profileAccent"
  | "profileBackground"
  | "isVerified"
  | "isHyperVerified"
  | "hyperBadgeStyle"
  | "hyperBadgeColor"
  | "hyperNameStyle"
  | "hyperNameColor"
  | "hyperNameGlow"
>;

function PublicBackdrop() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--bg)]">
      <div className="absolute top-[-15%] left-[-15%] size-[34rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute right-[-18%] bottom-[-18%] size-[38rem] rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute inset-x-0 top-8 text-center">
        <span className="dirami-shimmer text-xl font-black">Dirami</span>
      </div>
    </div>
  );
}

export function PublicProfileViewer({ user }: { user: ProfilePreview }) {
  const router = useRouter();
  const messagePath = `/chat?peer=${encodeURIComponent(user.id)}`;

  return (
    <main className="min-h-[100dvh]">
      <PublicBackdrop />
      <ProfileSheet
        fallback={user}
        fallbackState="none"
        meId=""
        onClose={() => router.push("/")}
        onMessage={() =>
          router.push(`/?next=${encodeURIComponent(messagePath)}`)
        }
        onOpenLinkedProfile={(linkedUser) =>
          router.push(`/u/u/@${encodeURIComponent(linkedUser.nickname)}`)
        }
        userId={user.id}
      />
    </main>
  );
}

export function PublicNftViewer({ nftId }: { nftId: string }) {
  const router = useRouter();

  function openProfile(user: NftPerson) {
    router.push(`/u/u/@${encodeURIComponent(user.nickname)}`);
  }

  return (
    <main className="min-h-[100dvh]">
      <PublicBackdrop />
      <NftDetailsModal
        nftId={nftId}
        onClose={() => router.push("/")}
        onOpenProfile={openProfile}
      />
    </main>
  );
}
