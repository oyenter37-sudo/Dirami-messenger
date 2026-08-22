import { redirect } from "next/navigation";
import { MessengerApp } from "@/components/messenger-app";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChatPage() {
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
