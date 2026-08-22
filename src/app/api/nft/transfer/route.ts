import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { parseNickname } from "@/lib/validators";
import {
  consumeRateLimit,
  getUserLimits,
  HOUR,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class TransferConflictError extends Error {}

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { nftId?: unknown; toNickname?: unknown };
  const nftId = typeof payload.nftId === "string" ? payload.nftId : "";
  const toNickname = parseNickname(payload.toNickname);

  if (!nftId || !toNickname) {
    return jsonError("Укажи NFT и ник получателя", 400);
  }

  const limits = await getUserLimits(auth.session.userId);
  const transferLimit = await consumeRateLimit({
    subject: `user:${auth.session.userId}`,
    action: "nft_transfer",
    limit: limits.nftTransfersPerHour,
    windowMs: HOUR,
  });
  if (!transferLimit.allowed) {
    return rateLimitResponse(
      transferLimit,
      `Можно передать не более ${limits.nftTransfersPerHour} NFT в час`,
    );
  }

  const [nft, recipient] = await Promise.all([
    prisma.nft.findUnique({ where: { id: nftId } }),
    prisma.user.findFirst({
      where: { nickname: { equals: toNickname, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);

  if (!nft || nft.ownerId !== auth.session.userId) {
    return jsonError("Этот NFT тебе не принадлежит", 403);
  }
  if (!recipient) {
    return jsonError("Пользователь не найден", 404);
  }
  if (recipient.id === auth.session.userId) {
    return jsonError("Нельзя передать самому себе", 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const transfer = await tx.nft.updateMany({
        where: { id: nft.id, ownerId: auth.session.userId },
        data: { ownerId: recipient.id },
      });
      if (transfer.count !== 1) throw new TransferConflictError();

      await tx.nftTransfer.create({
        data: {
          nftId: nft.id,
          fromUserId: auth.session.userId,
          toUserId: recipient.id,
        },
      });
      return tx.nft.findUnique({ where: { id: nft.id } });
    });
    return NextResponse.json({ ok: true, nft: updated });
  } catch (error) {
    if (error instanceof TransferConflictError) {
      return jsonError("NFT уже был передан", 409);
    }
    throw error;
  }
}
