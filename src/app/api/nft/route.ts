import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { parseHttpUrl } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN = "mara";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  if (auth.session.nickname.toLowerCase() !== ADMIN) {
    return jsonError("Только админ может выпускать NFT", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as {
    name?: unknown;
    quantity?: unknown;
    valueRub?: unknown;
    imageUrl?: unknown;
  };

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const imageUrl = parseHttpUrl(payload.imageUrl);
  const quantity = Number(payload.quantity);
  const valueRub = Number(payload.valueRub);

  if (name.length < 1 || name.length > 64) {
    return jsonError("Название: 1–64 символа", 400);
  }
  if (!imageUrl) {
    return jsonError("Нужна ссылка на картинку", 400);
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return jsonError("Количество: от 1 до 50", 400);
  }
  if (!Number.isInteger(valueRub) || valueRub < 1 || valueRub > 1_000_000_000) {
    return jsonError("Ценность в рублях некорректна", 400);
  }

  await prisma.nft.createMany({
    data: Array.from({ length: quantity }, () => ({
      name,
      imageUrl,
      valueRub,
      ownerId: auth.session.userId,
    })),
  });

  return NextResponse.json({ ok: true, created: quantity });
}
