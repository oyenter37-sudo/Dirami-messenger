import Link from "next/link";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const posts = await prisma.post.findMany({
    include: { author: true },
    orderBy: { id: "asc" },
  });

  return (
    <main className="page">
      <div className="wrap">
        <Link href="/" className="link">
          ← Users
        </Link>
        <h1>Posts</h1>
        <p className="lede">
          Loaded with <code>include: {"{ author: true }"}</code>
        </p>

        {posts.length === 0 ? (
          <p className="empty">
            No posts yet. Run <code>npm run db:seed</code>.
          </p>
        ) : (
          <ul className="posts">
            {posts.map((post) => (
              <li key={post.id} className="post">
                <div className="post-head">
                  <div>
                    <h2>{post.title}</h2>
                    <p className="meta">
                      by {post.author.name ?? post.author.email}
                    </p>
                  </div>
                  <span className={`chip ${post.published ? "ok" : ""}`}>
                    {post.published ? "published" : "draft"}
                  </span>
                </div>
                {post.content ? <p className="body">{post.content}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
