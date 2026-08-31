-- AlterTable
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: keep the poll cursor semantics stable for existing rows
UPDATE "Message" SET "updatedAt" = "createdAt";
