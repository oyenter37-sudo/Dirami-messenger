ALTER TABLE "User"
ADD COLUMN "hyperBadgeStyle" VARCHAR(16) NOT NULL DEFAULT 'special',
ADD COLUMN "hyperBadgeColor" VARCHAR(7) NOT NULL DEFAULT '#a855f7',
ADD COLUMN "hyperNameStyle" VARCHAR(16) NOT NULL DEFAULT 'rainbow',
ADD COLUMN "hyperNameColor" VARCHAR(7) NOT NULL DEFAULT '#f8fafc',
ADD COLUMN "hyperNameGlow" VARCHAR(7) NOT NULL DEFAULT '#a855f7';

UPDATE "User"
SET "hyperNameStyle" = 'verified'
WHERE "isHyperVerified" = true AND "isVerified" = true;
