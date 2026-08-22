BEGIN;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Existing users start with their current username as display name.
UPDATE "User" SET "displayName" = "nickname" WHERE "displayName" = '';

-- Resolve legacy case-insensitive username collisions before enforcing uniqueness.
-- Generated replacements are checked in a loop so they cannot collide with an existing name.
DO $$
DECLARE
    duplicate_user RECORD;
    candidate TEXT;
    attempt INTEGER;
BEGIN
    FOR duplicate_user IN
        SELECT "id"
        FROM (
            SELECT
                "id",
                ROW_NUMBER() OVER (
                    PARTITION BY LOWER("nickname")
                    ORDER BY CASE WHEN "nickname" = 'mara' THEN 0 ELSE 1 END, "createdAt", "id"
                ) AS position
            FROM "User"
        ) AS ranked
        WHERE ranked.position > 1
    LOOP
        attempt := 0;
        LOOP
            candidate := 'user_' || SUBSTRING(MD5(duplicate_user."id" || ':' || attempt), 1, 19);
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM "User" WHERE LOWER("nickname") = LOWER(candidate)
            );
            attempt := attempt + 1;
        END LOOP;

        UPDATE "User" SET "nickname" = candidate WHERE "id" = duplicate_user."id";
    END LOOP;
END $$;

-- Usernames are case-insensitively unique from now on.
CREATE UNIQUE INDEX "User_nickname_lower_key" ON "User"(LOWER("nickname"));

-- Preserve the canonical administrator account. Admin rights no longer depend on username.
UPDATE "User" SET "isAdmin" = true WHERE "nickname" = 'mara';

-- CreateTable
CREATE TABLE "UserLimit" (
    "userId" TEXT NOT NULL,
    "messagesPerMinute" INTEGER NOT NULL DEFAULT 12,
    "pendingRequests" INTEGER NOT NULL DEFAULT 3,
    "chatRequestsPerHour" INTEGER NOT NULL DEFAULT 10,
    "requestActionsPerMinute" INTEGER NOT NULL DEFAULT 30,
    "reactionsPerMinute" INTEGER NOT NULL DEFAULT 30,
    "chatListReadsPerMinute" INTEGER NOT NULL DEFAULT 40,
    "messageReadsPerMinute" INTEGER NOT NULL DEFAULT 90,
    "searchesPerMinute" INTEGER NOT NULL DEFAULT 30,
    "profileViewsPerMinute" INTEGER NOT NULL DEFAULT 60,
    "profileUpdatesPerHour" INTEGER NOT NULL DEFAULT 12,
    "passwordChangesPerHour" INTEGER NOT NULL DEFAULT 5,
    "nftTransfersPerHour" INTEGER NOT NULL DEFAULT 20,
    "nftMintsPerHour" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLimit_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_subject_action_windowStart_idx" ON "RateLimitBucket"("subject", "action", "windowStart");

-- AddForeignKey
ALTER TABLE "UserLimit" ADD CONSTRAINT "UserLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
