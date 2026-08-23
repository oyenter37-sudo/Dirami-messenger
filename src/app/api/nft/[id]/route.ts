import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  MINUTE,
  rateLimitResponse,
  requestAddress,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userSelect = {
  id: true,
  nickname: true,
  displayName: true,
  isVerified: true,
  isHyperVerified: true,
  hyperBadgeStyle: true,
  hyperBadgeColor: true,
  hyperNameStyle: true,
  hyperNameColor: true,
  hyperNameGlow: true,
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  const session = auth.error ? null : auth.session;

  const detailLimit = await consumeRateLimit({
    subject: session ? `user:${session.userId}` : requestAddress(request),
    action: "nft_detail",
    limit: 60,
    windowMs: MINUTE,
  });
  if (!detailLimit.allowed) {
    return rateLimitResponse(detailLimit, "Слишком много открытий NFT");
  }

  const { id } = await context.params;
  if (!id || id.length > 64) return jsonError("Некорректный NFT", 400);

  const nft = await prisma.nft.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      valueRub: true,
      createdAt: true,
      owner: { select: userSelect },
      creator: { select: userSelect },
      transfers: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          createdAt: true,
          fromUser: { select: userSelect },
          toUser: { select: userSelect },
        },
      },
      _count: { select: { transfers: true } },
    },
  });
  if (!nft) return jsonError("NFT не найден", 404);

  const latestTransfer = nft.transfers[0] ?? null;
  return NextResponse.json({
    nft: {
      id: nft.id,
      name: nft.name,
      imageUrl: nft.imageUrl,
      valueRub: nft.valueRub,
      createdAt: nft.createdAt,
      owner: nft.owner,
      creator: nft.creator,
      receivedFrom: latestTransfer?.fromUser ?? nft.creator,
      receivedAt: latestTransfer?.createdAt ?? nft.createdAt,
      transferCount: nft._count.transfers,
    },
  });
}
