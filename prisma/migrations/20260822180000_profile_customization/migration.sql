-- AlterTable
ALTER TABLE "User"
ADD COLUMN "avatarUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "profileAccent" TEXT NOT NULL DEFAULT '#4fbfa8',
ADD COLUMN "profileBackground" TEXT NOT NULL DEFAULT 'aurora';
