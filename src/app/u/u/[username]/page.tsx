import { notFound, redirect } from "next/navigation";
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
  const username = rawUsername.replace(/^@/, "").trim();
  if (!username || username.length > 24) notFound();

  const publicPath = `/u/u/@${encodeURIComponent(username)}`;
  const session = await getSession();
  if (!session) {
    redirect(`/?next=${encodeURIComponent(publicPath)}`);
  }

  const [viewer, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionVersion: true },
    }),
    prisma.user.findFirst({
      where: { nickname: { equals: username, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);
  if (!viewer || viewer.sessionVersion !== session.sessionVersion) {
    redirect(`/?next=${encodeURIComponent(publicPath)}`);
  }
  if (!target) notFound();

  redirect(`/chat?profile=${encodeURIComponent(target.id)}`);
}
