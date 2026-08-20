import Link from "next/link";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const users = await prisma.user.findMany({
    include: {
      _count: { select: { posts: true } },
    },
    orderBy: { id: "asc" },
  });

  return (
    <main className="page">
      <div className="wrap">
        <p className="kicker">Next.js 16 · Prisma 7 · SQLite</p>
        <h1>Prisma is connected</h1>
        <p className="lede">
          Users below come from SQLite via Prisma Client. Edit{" "}
          <code>prisma/schema.prisma</code> and run <code>npm run db:migrate</code>.
        </p>

        <section className="card">
          <div className="card-head">
            <h2>Users</h2>
            <Link href="/posts" className="link">
              View posts
            </Link>
          </div>

          {users.length === 0 ? (
            <p className="empty">
              No users yet. Run <code>npm run db:seed</code>.
            </p>
          ) : (
            <ul className="list">
              {users.map((user) => (
                <li key={user.id} className="row">
                  <div>
                    <p>{user.name ?? "Unnamed"}</p>
                    <p className="email">{user.email}</p>
                  </div>
                  <span className="chip">{user._count.posts} posts</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
