BEGIN;

CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsRead" (
    "userId" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsRead_pkey" PRIMARY KEY ("userId", "newsId")
);

CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");
CREATE INDEX "NewsRead_newsId_idx" ON "NewsRead"("newsId");

ALTER TABLE "News"
ADD CONSTRAINT "News_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsRead"
ADD CONSTRAINT "NewsRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsRead"
ADD CONSTRAINT "NewsRead_newsId_fkey"
FOREIGN KEY ("newsId") REFERENCES "News"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
