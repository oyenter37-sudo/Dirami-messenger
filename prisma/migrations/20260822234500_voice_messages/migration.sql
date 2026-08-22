-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "Message"
ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "VoiceMessage" (
    "messageId" TEXT NOT NULL,
    "data" BYTEA,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "listenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceMessage_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE INDEX "VoiceMessage_listenedAt_idx" ON "VoiceMessage"("listenedAt");

-- AddForeignKey
ALTER TABLE "VoiceMessage"
ADD CONSTRAINT "VoiceMessage_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
