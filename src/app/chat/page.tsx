import { redirect } from "next/navigation";
import { MessengerApp } from "@/components/messenger-app";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return <MessengerApp me={session} />;
}
