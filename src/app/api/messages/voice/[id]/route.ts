import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(value: string | null, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return "invalid" as const;

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return "invalid" as const;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return "invalid" as const;
  }
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id || id.length > 64) return jsonError("Некорректное сообщение", 400);

  const voice = await prisma.voiceMessage.findUnique({
    where: { messageId: id },
    select: {
      data: true,
      mimeType: true,
      listenedAt: true,
      message: { select: { senderId: true, receiverId: true } },
    },
  });
  if (
    !voice ||
    (voice.message.senderId !== auth.session.userId &&
      voice.message.receiverId !== auth.session.userId)
  ) {
    return jsonError("Голосовое сообщение не найдено", 404);
  }
  if (!voice.data || voice.listenedAt) {
    return jsonError("Голосовое сообщение уже прослушано", 410);
  }

  const bytes = new Uint8Array(voice.data);
  const range = parseRange(request.headers.get("range"), bytes.byteLength);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${bytes.byteLength}` },
    });
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": voice.mimeType,
    "X-Content-Type-Options": "nosniff",
  });

  if (range) {
    const body = bytes.slice(range.start, range.end + 1);
    headers.set("Content-Length", String(body.byteLength));
    headers.set(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${bytes.byteLength}`,
    );
    return new Response(body, { status: 206, headers });
  }

  headers.set("Content-Length", String(bytes.byteLength));
  return new Response(bytes, { status: 200, headers });
}
