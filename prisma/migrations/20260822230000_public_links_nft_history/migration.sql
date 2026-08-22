BEGIN;

ALTER TABLE "Nft"
ADD COLUMN "creatorId" TEXT;

-- Existing items were issued by the first persisted administrator when one exists.
UPDATE "Nft"
SET "creatorId" = (
    SELECT "id"
    FROM "User"
    WHERE "isAdmin" = true
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
)
WHERE "creatorId" IS NULL;

CREATE TABLE "NftTransfer" (
    "id" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NftTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Nft_creatorId_idx" ON "Nft"("creatorId");
CREATE INDEX "NftTransfer_nftId_createdAt_idx" ON "NftTransfer"("nftId", "createdAt");
CREATE INDEX "NftTransfer_fromUserId_idx" ON "NftTransfer"("fromUserId");
CREATE INDEX "NftTransfer_toUserId_idx" ON "NftTransfer"("toUserId");

ALTER TABLE "Nft"
ADD CONSTRAINT "Nft_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NftTransfer"
ADD CONSTRAINT "NftTransfer_nftId_fkey"
FOREIGN KEY ("nftId") REFERENCES "Nft"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NftTransfer"
ADD CONSTRAINT "NftTransfer_fromUserId_fkey"
FOREIGN KEY ("fromUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NftTransfer"
ADD CONSTRAINT "NftTransfer_toUserId_fkey"
FOREIGN KEY ("toUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
