import { redirect } from "next/navigation";
import { MessengerApp } from "@/components/messenger-app";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{
    profile?: string | string[];
    nft?: string | string[];
    peer?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const initialProfileId =
    typeof params.profile === "string" && params.profile.length <= 64
      ? params.profile
      : null;
  const initialNftId =
    typeof params.nft === "string" && params.nft.length <= 64
      ? params.nft
      : null;
  const initialPeerId =
    typeof params.peer === "string" && params.peer.length <= 64
      ? params.peer
      : null;
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      nickname: true,
      displayName: true,
      isAdmin: true,
      isVerified: true,
      sessionVersion: true,
    },
  });
  if (!currentUser || currentUser.sessionVersion !== session.sessionVersion)
    redirect("/");

  return (
    <MessengerApp
      initialNftId={initialNftId}
      initialPeerId={initialPeerId}
      initialProfileId={initialProfileId}
      me={{
        ...session,
        nickname: currentUser.nickname,
        displayName: currentUser.displayName || currentUser.nickname,
        isAdmin: currentUser.isAdmin,
        isVerified: currentUser.isVerified,
      }}
    />
  );
}
