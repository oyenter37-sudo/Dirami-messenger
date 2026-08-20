import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  const users = await prisma.user.findMany({
    include: { posts: true },
    orderBy: { id: "asc" },
  });

  console.log(`users=${users.length}`);
  for (const user of users) {
    console.log(`- ${user.name} <${user.email}> posts=${user.posts.length}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
