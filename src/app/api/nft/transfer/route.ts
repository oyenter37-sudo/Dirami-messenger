import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { parseNickname } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
  if (toNickname.toLowerCase() === auth.session.nickname.toLowerCase()) {
    return jsonError("Нельзя передать самому себе", 400);
  }

  const [nft, recipient] = await Promise.all([
    prisma.nft.findUnique({ where: { id: nftId } }),
    prisma.user.findFirst({
      where: { nickname: { equals: toNickname, mode: "insensitive" } },
    }),
  ]);

  if (!nft || nft.ownerId !== auth.session.userId) {
    return jsonError("Этот NFT тебе не принадлежит", 403);
  }
  if (!recipient) {
    return jsonError("Пользователь не найден", 404);
  }

  const updated = await prisma.nft.update({
    where: { id: nft.id },
    data: { ownerId: recipient.id },
  });

  return NextResponse.json({ ok: true, nft: updated });
}
