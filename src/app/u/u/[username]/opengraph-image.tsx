import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decodePublicUsername } from "@/lib/public-links";

export const runtime = "nodejs";
export const alt = "Профиль пользователя Dirami";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function UserOpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = decodePublicUsername(rawUsername);
  if (!username) notFound();

  const user = await prisma.user.findFirst({
    where: { nickname: { equals: username, mode: "insensitive" } },
    select: {
      nickname: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      profileAccent: true,
      isVerified: true,
      _count: { select: { nfts: true } },
    },
  });
  if (!user) notFound();

  const name = user.displayName || user.nickname;
  const initials = name.slice(0, 2).toUpperCase();
  const accent = user.profileAccent || "#4fbfa8";

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at 14% 10%, rgba(71,210,187,.3), transparent 37%), radial-gradient(circle at 90% 95%, rgba(62,156,255,.25), transparent 42%), #071116",
        color: "#f3fffc",
        display: "flex",
        fontFamily: "sans-serif",
        height: "100%",
        overflow: "hidden",
        padding: "68px 78px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255,255,255,.13)",
          borderRadius: 46,
          bottom: 45,
          left: 45,
          position: "absolute",
          right: 45,
          top: 45,
        }}
      />
      <div
        style={{
          background: accent,
          borderRadius: 999,
          height: 360,
          opacity: 0.12,
          position: "absolute",
          right: -60,
          top: -90,
          width: 360,
        }}
      />

      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: `linear-gradient(145deg, ${accent}, #102a31)`,
            border: "7px solid rgba(255,255,255,.14)",
            borderRadius: 72,
            boxShadow: "0 28px 85px rgba(0,0,0,.45)",
            display: "flex",
            flexShrink: 0,
            height: 330,
            justifyContent: "center",
            overflow: "hidden",
            width: 330,
          }}
        >
          {user.avatarUrl ? (
            <img
              alt=""
              height="330"
              src={user.avatarUrl}
              style={{ height: "100%", objectFit: "cover", width: "100%" }}
              width="330"
            />
          ) : (
            <span style={{ fontSize: 112, fontWeight: 900 }}>{initials}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 60,
            minWidth: 0,
          }}
        >
          <div
            style={{
              alignItems: "center",
              color: "#84ddcf",
              display: "flex",
              fontSize: 25,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            <span>Публичный профиль</span>
            <span style={{ color: "rgba(255,255,255,.35)", margin: "0 14px" }}>
              ·
            </span>
            <span>Dirami</span>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: name.length > 22 ? 57 : 70,
              fontWeight: 900,
              letterSpacing: -2,
              marginTop: 22,
              maxWidth: 650,
              whiteSpace: "nowrap",
            }}
          >
            <span>{name}</span>
            {user.isVerified ? (
              <span
                style={{
                  alignItems: "center",
                  background: "#4aaeff",
                  borderRadius: 999,
                  display: "flex",
                  fontSize: 24,
                  height: 42,
                  justifyContent: "center",
                  marginLeft: 18,
                  width: 42,
                }}
              >
                ✓
              </span>
            ) : null}
          </div>
          <div
            style={{
              color: accent,
              display: "flex",
              fontSize: 32,
              fontWeight: 800,
              marginTop: 8,
            }}
          >
            @{user.nickname}
          </div>
          <div
            style={{
              color: "rgba(236,255,251,.72)",
              display: "flex",
              fontSize: 24,
              lineHeight: 1.4,
              marginTop: 24,
              maxWidth: 650,
            }}
          >
            {(user.bio || "Профиль пользователя в мессенджере Dirami").slice(
              0,
              125,
            )}
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              marginTop: 34,
            }}
          >
            <span
              style={{
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 999,
                fontSize: 21,
                fontWeight: 800,
                padding: "13px 22px",
              }}
            >
              NFT в коллекции: {user._count.nfts}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,.5)",
                fontSize: 20,
                marginLeft: 20,
              }}
            >
              dirami.vercel.app
            </span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
