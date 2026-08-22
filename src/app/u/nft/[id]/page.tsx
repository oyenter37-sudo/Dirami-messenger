import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicNftViewer } from "@/components/public-link-viewer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nftPublicPath } from "@/lib/public-links";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id || id.length > 64) return { title: "NFT не найден" };

  const nft = await prisma.nft.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      valueRub: true,
      owner: { select: { nickname: true, displayName: true } },
    },
  });
  if (!nft) return { title: "NFT не найден" };

  const title = `${nft.name} · NFT Dirami`;
  const owner = nft.owner.displayName || nft.owner.nickname;
  const description = `${nft.valueRub.toLocaleString("ru-RU")} ₽ · Владелец: ${owner} (@${nft.owner.nickname})`;
  const path = nftPublicPath(nft.id);
  const image = `${path}/opengraph-image`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "Dirami",
      url: path,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function NftLinkPage({ params }: PageProps) {
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
