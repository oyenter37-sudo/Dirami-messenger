"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function AuthWindow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nickname, password }),
        },
      );

      let data: { error?: string } = {};
      try {
        data = (await response.json()) as { error?: string };
      } catch {
        setError(
          response.ok
            ? "Сеть недоступна"
            : `Ошибка сервера (${response.status})`,
        );
        setPending(false);
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Не получилось войти");
        setPending(false);
        return;
      }

      router.replace("/chat");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#fb923c22,_transparent_42%),radial-gradient(circle_at_bottom_left,_#7c3aed22,_transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[48px_48px]" />

      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-[0_30px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/90" />
          <span className="size-2.5 rounded-full bg-amber-400/90" />
          <span className="size-2.5 rounded-full bg-emerald-400/90" />
          <p className="ml-2 text-xs tracking-wide text-zinc-500">dirami://auth</p>
        </header>

        <div className="px-6 py-8 sm:px-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-orange-400 text-lg font-semibold text-zinc-950">
              D
            </span>
            <div>
              <p className="text-sm font-medium text-orange-300">Dirami</p>
              <h1 className="text-2xl font-semibold tracking-tight">Мессенджер</h1>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Регистрация
            </button>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Ник</span>
              <input
                autoComplete="username"
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-zinc-50 placeholder:text-zinc-600 focus:border-orange-400/70"
                maxLength={24}
                name="nickname"
                onChange={(event) => setNickname(event.target.value)}
                placeholder="например, mara"
                value={nickname}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Пароль</span>
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-zinc-50 placeholder:text-zinc-600 focus:border-orange-400/70"
                maxLength={72}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="минимум 6 символов"
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              className="w-full rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              type="submit"
            >
              {pending
                ? "Секунду…"
                : mode === "login"
                  ? "Войти"
                  : "Создать аккаунт"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
