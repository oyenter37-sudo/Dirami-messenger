-- Existing password accounts keep their hashes. New Google-only accounts may not have a password.
ALTER TABLE "User"
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Store the stable Google subject separately from mutable email/profile data.
CREATE TABLE "GoogleAccount" (
    "googleSubject" VARCHAR(255) NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(120) NOT NULL DEFAULT '',
    "pictureUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("googleSubject")
);

CREATE UNIQUE INDEX "GoogleAccount_userId_key" ON "GoogleAccount"("userId");
CREATE INDEX "GoogleAccount_email_idx" ON "GoogleAccount"("email");

ALTER TABLE "GoogleAccount"
ADD CONSTRAINT "GoogleAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
