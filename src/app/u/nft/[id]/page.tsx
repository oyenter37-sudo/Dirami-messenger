import { notFound, redirect } from "next/navigation";
import { PublicNftViewer } from "@/components/public-link-viewer";
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

  const session = await getSession();
  const [viewer, nft] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.userId },
          select: { sessionVersion: true },
        })
      : Promise.resolve(null),
    prisma.nft.findUnique({ where: { id }, select: { id: true } }),
  ]);
  if (!nft) notFound();

  if (session && viewer?.sessionVersion === session.sessionVersion) {
    redirect(`/chat?nft=${encodeURIComponent(nft.id)}`);
  }

  return <PublicNftViewer nftId={nft.id} />;
}
