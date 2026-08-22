import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "NFT в Dirami";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function NftOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id.length > 64) notFound();

  const nft = await prisma.nft.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      valueRub: true,
      owner: {
        select: { nickname: true, displayName: true, isVerified: true },
      },
      creator: { select: { nickname: true, displayName: true } },
    },
  });
  if (!nft) notFound();

  const ownerName = nft.owner.displayName || nft.owner.nickname;

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at 85% 12%, rgba(255,186,73,.24), transparent 34%), radial-gradient(circle at 5% 95%, rgba(71,210,187,.22), transparent 40%), #081013",
        color: "#f7fffd",
        display: "flex",
        fontFamily: "sans-serif",
        height: "100%",
        overflow: "hidden",
        padding: "58px 68px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255,255,255,.13)",
          borderRadius: 46,
          bottom: 40,
          left: 40,
          position: "absolute",
          right: 40,
          top: 40,
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
            background: "linear-gradient(145deg, #e8b45d, #5d3d19)",
            border: "7px solid rgba(255,224,169,.22)",
            borderRadius: 62,
            boxShadow: "0 30px 90px rgba(0,0,0,.48)",
            display: "flex",
            flexShrink: 0,
            height: 430,
            overflow: "hidden",
            padding: 8,
            width: 430,
          }}
        >
          <img
            alt=""
            height="400"
            src={nft.imageUrl}
            style={{
              borderRadius: 48,
              height: "100%",
              objectFit: "cover",
              width: "100%",
            }}
            width="400"
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 58,
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#ffd995",
              display: "flex",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            NFT · Dirami
          </div>
          <div
            style={{
              display: "flex",
              fontSize: nft.name.length > 20 ? 54 : 68,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1.05,
              marginTop: 24,
              maxWidth: 610,
            }}
          >
            {nft.name.slice(0, 42)}
          </div>
          <div
            style={{
              color: "#ffd995",
              display: "flex",
              fontSize: 40,
              fontWeight: 900,
              marginTop: 18,
            }}
          >
            {nft.valueRub.toLocaleString("ru-RU")} ₽
          </div>

          <div
            style={{
              background: "rgba(255,255,255,.07)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 28,
              display: "flex",
              flexDirection: "column",
              marginTop: 30,
              padding: "19px 24px",
              width: 570,
            }}
          >
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 17 }}>
              Текущий владелец
            </span>
            <div
              style={{
                alignItems: "center",
                display: "flex",
                fontSize: 25,
                fontWeight: 850,
                marginTop: 5,
              }}
            >
              <span>{ownerName}</span>
              {nft.owner.isVerified ? (
                <span style={{ color: "#60bfff", marginLeft: 8 }}>✓</span>
              ) : null}
              <span style={{ color: "rgba(255,255,255,.5)", marginLeft: 10 }}>
                @{nft.owner.nickname}
              </span>
            </div>
          </div>

          <div
            style={{
              color: "rgba(255,255,255,.47)",
              display: "flex",
              fontSize: 17,
              marginTop: 21,
            }}
          >
            ID {nft.id} · Выпустил @{nft.creator?.nickname ?? "Dirami"}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
