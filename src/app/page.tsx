import { redirect } from "next/navigation";
import { AuthWindow } from "@/components/auth-window";
import { getSession } from "@/lib/auth";
import { safeInternalPath } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeInternalPath(
    typeof params.next === "string" ? params.next : undefined,
  );
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionVersion: true },
    });
    if (user?.sessionVersion === session.sessionVersion) {
      redirect(nextPath);
    }
  }

  return <AuthWindow nextPath={nextPath} />;
}
