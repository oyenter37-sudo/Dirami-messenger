"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type GoogleProfile = {
  email: string;
  name: string;
  pictureUrl: string;
};

type Props = {
  nextPath?: string;
};

async function readJson(response: Response) {
  try {
    return (await response.json()) as {
      error?: string;
      code?: string;
      googleProfile?: GoogleProfile;
    };
  } catch {
    return null;
  }
}

export function AuthWindow({ nextPath = "/chat" }: Props) {
  const router = useRouter();
  const [googleCredential, setGoogleCredential] = useState("");
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(
    null,
  );
  const [nickname, setNickname] = useState("");
  const [choosingNickname, setChoosingNickname] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function enterMessenger() {
    router.replace(nextPath);
    router.refresh();
  }

  async function receiveGoogleCredential(credential: string) {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", credential }),
      });
      const data = await readJson(response);
      if (response.ok) {
        enterMessenger();
        return;
      }
      if (data?.code === "GOOGLE_NOT_LINKED" && data.googleProfile) {
        setGoogleCredential(credential);
        setGoogleProfile(data.googleProfile);
        setChoosingNickname(true);
        return;
      }
      setError(data?.error ?? "Не получилось войти через Google");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  async function createGoogleAccount() {
    if (!googleCredential) {
      resetGoogleSetup();
      setError("Нажмите «Продолжить с Google» ещё раз");
      return;
    }

    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "register",
          credential: googleCredential,
          nickname,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        if (data?.code === "GOOGLE_CREDENTIAL_INVALID") resetGoogleSetup();
        setError(data?.error ?? "Не удалось создать профиль Dirami");
        return;
      }
      enterMessenger();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  function resetGoogleSetup() {
    setChoosingNickname(false);
    setGoogleCredential("");
    setGoogleProfile(null);
    setNickname("");
    setError("");
  }

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--glow-a),transparent_42%),radial-gradient(circle_at_bottom_left,var(--glow-b),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[48px_48px]" />

      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)]/90 shadow-[0_30px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/90" />
          <span className="size-2.5 rounded-full bg-amber-400/90" />
          <span className="size-2.5 rounded-full bg-emerald-400/90" />
          <p className="ml-2 text-xs tracking-wide text-zinc-500">
            dirami://google-auth
          </p>
        </header>

        <div className="px-6 py-8 sm:px-8">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-lg font-black text-on-accent shadow-[0_16px_38px_-20px_var(--accent)]">
              D
            </span>
            <div>
              <p className="text-sm font-medium text-accent-soft">Dirami</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {choosingNickname ? "Ваш новый юз" : "Добро пожаловать"}
              </h1>
            </div>
          </div>

          {choosingNickname ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void createGoogleAccount();
              }}
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-lg font-black text-[#4285f4]">
                    G
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {googleProfile?.name || "Google-аккаунт"}
                    </span>
                    <span className="block truncate text-xs text-[var(--muted-2)]">
                      {googleProfile?.email}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Выберите юз Dirami</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-2)]">
                  Он будет виден в профиле и ссылке. Google email останется
                  скрытым.
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--muted-2)]">
                  Юз
                </span>
                <div className="flex items-center rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 focus-within:border-[var(--accent)]">
                  <span className="text-[var(--muted-2)]">@</span>
                  <input
                    autoComplete="username"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base outline-none placeholder:text-[var(--muted-2)]"
                    maxLength={24}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="например, mara"
                    value={nickname}
                  />
                </div>
              </label>

              {error ? <AuthError text={error} /> : null}

              <button
                className="hover-accent w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending || !nickname.trim()}
                type="submit"
              >
                {pending ? "Создаём профиль…" : "Продолжить в Dirami"}
              </button>
              <button
                className="w-full py-1 text-sm text-[var(--muted-2)] hover:text-[var(--text)]"
                disabled={pending}
                onClick={resetGoogleSetup}
                type="button"
              >
                Выбрать другой Google-аккаунт
              </button>
            </form>
          ) : (
            <div>
              <div className="mb-6 rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-sm font-semibold">Единый безопасный вход</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--muted-2)]">
                  Вход и создание аккаунта выполняются только через Google. Для
                  нового профиля после входа вы выберете собственный юз Dirami.
                </p>
              </div>

              <GoogleSignInButton
                disabled={pending}
                onCredential={(credential) =>
                  void receiveGoogleCredential(credential)
                }
              />

              {pending ? (
                <p className="mt-3 text-center text-xs text-[var(--muted-2)]">
                  Подтверждаем Google-аккаунт…
                </p>
              ) : null}
              {error ? (
                <div className="mt-4">
                  <AuthError text={error} />
                </div>
              ) : null}

              <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-white/3 px-3 py-3 text-[11px] leading-4 text-[var(--muted-2)]">
                <span className="mt-0.5 text-emerald-300">●</span>
                <p>
                  Email не публикуется. В настройках можно создать резервный
                  пароль и подключить Google к старому профилю, пока его сессия
                  ещё открыта.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AuthError({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {text}
    </p>
  );
}
