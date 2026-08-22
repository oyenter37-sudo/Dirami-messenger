import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const demoPassword = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const mara = await prisma.user.upsert({
    where: { nickname: "mara" },
    update: { displayName: "Mara", isAdmin: true },
    create: {
      nickname: "mara",
      displayName: "Mara",
      passwordHash,
      isAdmin: true,
    },
  });

  const leo = await prisma.user.upsert({
    where: { nickname: "leo" },
    update: {},
    create: { nickname: "leo", displayName: "Leo", passwordHash },
  });

  const nika = await prisma.user.upsert({
    where: { nickname: "nika" },
    update: {},
    create: { nickname: "nika", displayName: "Nika", passwordHash },
  });

  const existing = await prisma.message.count();
  if (existing === 0) {
    const pairs = [
      [mara.id, leo.id],
      [mara.id, nika.id],
    ].map(([first, second]) =>
      first < second
        ? { userAId: first, userBId: second }
        : { userAId: second, userBId: first },
    );

    await Promise.all(
      pairs.map((pair) =>
        prisma.chat.upsert({
          where: { userAId_userBId: pair },
          update: { status: "ACCEPTED" },
          create: { ...pair, initiatorId: mara.id, status: "ACCEPTED" },
        }),
      ),
    );

    await prisma.message.createMany({
      data: [
        {
          senderId: mara.id,
          receiverId: leo.id,
          content: "Привет, это Dirami.",
        },
        {
          senderId: leo.id,
          receiverId: mara.id,
          content: "Работает. Пиши сюда.",
        },
        {
          senderId: nika.id,
          receiverId: mara.id,
          content: "Я тоже здесь.",
        },
      ],
    });
  }

  console.log("Seeded mara, leo, nika / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
