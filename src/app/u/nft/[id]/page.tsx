import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NftLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id.length > 64) notFound();

  const publicPath = `/u/nft/${encodeURIComponent(id)}`;
  const session = await getSession();
  if (!session) {
    redirect(`/?next=${encodeURIComponent(publicPath)}`);
  }

  const [viewer, nft] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionVersion: true },
    }),
    prisma.nft.findUnique({ where: { id }, select: { id: true } }),
  ]);
  if (!viewer || viewer.sessionVersion !== session.sessionVersion) {
    redirect(`/?next=${encodeURIComponent(publicPath)}`);
  }
  if (!nft) notFound();

  redirect(`/chat?nft=${encodeURIComponent(nft.id)}`);
}
