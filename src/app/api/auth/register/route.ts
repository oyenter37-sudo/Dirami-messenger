import { jsonError } from "@/lib/api";
import { mutationGuard } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  return jsonError(
    "Регистрация по нику и паролю отключена. Продолжите через Google",
    410,
  );
}
