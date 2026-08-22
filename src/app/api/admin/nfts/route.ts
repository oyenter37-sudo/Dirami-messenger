import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAdmin } from "@/lib/api";
import { mutationGuard } from "@/lib/rate-limit";
import { parseNickname } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const userSelect = {
  id: true,
  nickname: true,
  displayName: true,
  isVerified: true,
} as const;

const nftSelect = {
  id: true,
  name: true,
  imageUrl: true,
  valueRub: true,
  createdAt: true,
  owner: { select: userSelect },
  creator: { select: userSelect },
  _count: { select: { transfers: true } },
} as const;

class TransferConflictError extends Error {}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") ?? "")
    .trim()
    .replace(/^@/, "")
    .slice(0, 64);
  const cursor = (searchParams.get("cursor") ?? "").trim();

  const where = query
    ? {
        OR: [
          { id: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
          {
            owner: {
              is: {
                OR: [
                  {
                    nickname: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    displayName: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
          {
            creator: {
              is: {
                OR: [
                  {
                    nickname: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    displayName: {
                      contains: query,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.nft.findMany({
      where,
      select: nftSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.nft.count({ where }),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return NextResponse.json({
    nfts: page.map((nft) => ({
      id: nft.id,
      name: nft.name,
      imageUrl: nft.imageUrl,
      valueRub: nft.valueRub,
      createdAt: nft.createdAt,
      owner: nft.owner,
      creator: nft.creator,
      transferCount: nft._count.transfers,
    })),
    total,
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  });
}

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { nftId?: unknown; toNickname?: unknown };
  const nftId = typeof payload.nftId === "string" ? payload.nftId.trim() : "";
  const rawNickname =
    typeof payload.toNickname === "string"
      ? payload.toNickname.trim().replace(/^@/, "")
      : "";
  const toNickname = parseNickname(rawNickname);

  if (!nftId || nftId.length > 64 || !toNickname) {
    return jsonError("Укажите NFT и корректный ник получателя", 400);
  }

  const [nft, recipient] = await Promise.all([
    prisma.nft.findUnique({
      where: { id: nftId },
      select: { id: true, ownerId: true },
    }),
    prisma.user.findFirst({
      where: { nickname: { equals: toNickname, mode: "insensitive" } },
      select: { id: true, nickname: true },
    }),
  ]);

  if (!nft) return jsonError("NFT не найден", 404);
  if (!recipient) return jsonError("Получатель не найден", 404);
  if (recipient.id === nft.ownerId) {
    return jsonError("Этот пользователь уже владеет NFT", 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const transfer = await tx.nft.updateMany({
        where: { id: nft.id, ownerId: nft.ownerId },
        data: { ownerId: recipient.id },
      });
      if (transfer.count !== 1) throw new TransferConflictError();

      await tx.nftTransfer.create({
        data: {
          nftId: nft.id,
          fromUserId: nft.ownerId,
          toUserId: recipient.id,
        },
      });

      return tx.nft.findUnique({ where: { id: nft.id }, select: nftSelect });
    });

    if (!updated) throw new TransferConflictError();
    return NextResponse.json({
      ok: true,
      nft: {
        id: updated.id,
        name: updated.name,
        imageUrl: updated.imageUrl,
        valueRub: updated.valueRub,
        createdAt: updated.createdAt,
        owner: updated.owner,
        creator: updated.creator,
        transferCount: updated._count.transfers,
      },
    });
  } catch (error) {
    if (error instanceof TransferConflictError) {
      return jsonError("Владелец NFT уже изменился. Обновите список", 409);
    }
    throw error;
  }
}
