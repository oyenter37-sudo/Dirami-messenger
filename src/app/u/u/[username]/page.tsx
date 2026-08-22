import { notFound, redirect } from "next/navigation";
import { PublicProfileViewer } from "@/components/public-link-viewer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function UserLinkPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  let decodedUsername = rawUsername;
  try {
    decodedUsername = decodeURIComponent(rawUsername);
  } catch {
    notFound();
  }
  const username = decodedUsername.replace(/^@/, "").trim();
  if (!username || username.length > 24) notFound();

  const session = await getSession();
  const [viewer, target] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.userId },
          select: { sessionVersion: true },
        })
      : Promise.resolve(null),
    prisma.user.findFirst({
      where: { nickname: { equals: username, mode: "insensitive" } },
      select: {
        id: true,
        nickname: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        profileAccent: true,
        profileBackground: true,
        isVerified: true,
      },
    }),
  ]);
  if (!target) notFound();

  if (session && viewer?.sessionVersion === session.sessionVersion) {
    redirect(`/chat?profile=${encodeURIComponent(target.id)}`);
  }

  return <PublicProfileViewer user={target} />;
}
