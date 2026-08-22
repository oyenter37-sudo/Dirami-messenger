-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "status" "ChatStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- Existing conversations predate chat requests. Preserve them as accepted chats.
INSERT INTO "Chat" (
    "id",
    "userAId",
    "userBId",
    "initiatorId",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_' || md5(LEAST("senderId", "receiverId") || ':' || GREATEST("senderId", "receiverId")),
    LEAST("senderId", "receiverId"),
    GREATEST("senderId", "receiverId"),
    (array_agg("senderId" ORDER BY "createdAt" ASC))[1],
    'ACCEPTED'::"ChatStatus",
    MIN("createdAt"),
    MAX("createdAt")
FROM "Message"
WHERE "senderId" <> "receiverId"
GROUP BY LEAST("senderId", "receiverId"), GREATEST("senderId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_userAId_userBId_key" ON "Chat"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "Chat_userAId_status_updatedAt_idx" ON "Chat"("userAId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Chat_userBId_status_updatedAt_idx" ON "Chat"("userBId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Chat_initiatorId_status_idx" ON "Chat"("initiatorId", "status");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
