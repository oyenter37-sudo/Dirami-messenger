import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicProfileViewer } from "@/components/public-link-viewer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodePublicUsername, userPublicPath } from "@/lib/public-links";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = decodePublicUsername(rawUsername);
  if (!username) return { title: "Профиль не найден" };

  const user = await prisma.user.findFirst({
    where: { nickname: { equals: username, mode: "insensitive" } },
    select: {
      nickname: true,
      displayName: true,
      bio: true,
      isVerified: true,
      isHyperVerified: true,
    },
  });
  if (!user) return { title: "Профиль не найден" };

  const name = user.displayName || user.nickname;
  const title = `${name}${user.isVerified ? " ✓" : ""}${user.isHyperVerified ? " ✦" : ""} (@${user.nickname})`;
  const description =
    user.bio || `Публичный профиль @${user.nickname} в мессенджере Dirami`;
  const path = userPublicPath(user.nickname);
  const image = `${path}/opengraph-image`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "profile",
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

export default async function UserLinkPage({ params }: PageProps) {
  const { username: rawUsername } = await params;
  const username = decodePublicUsername(rawUsername);
  if (!username) notFound();

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
        extraProfile: true,
        avatarUrl: true,
        profileAccent: true,
        profileBackground: true,
        isVerified: true,
        isHyperVerified: true,
      },
    }),
  ]);
  if (!target) notFound();

  if (session && viewer?.sessionVersion === session.sessionVersion) {
    redirect(`/chat?profile=${encodeURIComponent(target.id)}`);
  }

  return <PublicProfileViewer user={target} />;
}
