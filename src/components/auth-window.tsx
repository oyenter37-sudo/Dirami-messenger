"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type Mode = "login" | "register";
type GoogleStep = "choice" | "register" | "link" | null;

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
  const [mode, setMode] = useState<Mode>("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [googleStep, setGoogleStep] = useState<GoogleStep>(null);
  const [googleCredential, setGoogleCredential] = useState("");
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(
    null,
  );
  const [googleNickname, setGoogleNickname] = useState("");
  const [existingNickname, setExistingNickname] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function enterMessenger() {
    router.replace(nextPath);
    router.refresh();
  }

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
      const data = await readJson(response);
      if (!data) {
        setError(
          response.ok
            ? "Сеть недоступна"
            : `Ошибка сервера (${response.status})`,
        );
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "Не получилось войти");
        return;
      }
      enterMessenger();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setPending(false);
    }
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
        setGoogleStep("choice");
        return;
      }
      setError(data?.error ?? "Не получилось войти через Google");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  async function completeGoogleSetup(action: "register" | "link") {
    if (!googleCredential) {
      setGoogleStep(null);
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
          action,
          credential: googleCredential,
          nickname: action === "register" ? googleNickname : existingNickname,
          password: action === "link" ? existingPassword : undefined,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        if (data?.code === "GOOGLE_CREDENTIAL_INVALID") {
          setGoogleStep(null);
          setGoogleCredential("");
        }
        setError(data?.error ?? "Не удалось подключить Google");
        return;
      }
      enterMessenger();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setPending(false);
    }
  }

  function closeGoogleSetup() {
    setGoogleStep(null);
    setGoogleCredential("");
    setGoogleProfile(null);
    setGoogleNickname("");
    setExistingNickname("");
    setExistingPassword("");
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
            dirami://auth
          </p>
        </header>

        <div className="px-6 py-8 sm:px-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-lg font-semibold text-on-accent">
              D
            </span>
            <div>
              <p className="text-sm font-medium text-accent-soft">Dirami</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Мессенджер
              </h1>
            </div>
          </div>

          {googleStep ? (
            <div>
              <button
                className="mb-4 text-sm text-[var(--muted-2)] hover:text-[var(--text)]"
                disabled={pending}
                onClick={closeGoogleSetup}
                type="button"
              >
                ← Другой способ входа
              </button>

              <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="text-sm font-semibold">
                  {googleProfile?.name || "Google-аккаунт"}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted-2)]">
                  {googleProfile?.email}
                </p>
              </div>

              {googleStep === "choice" ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Как подключить Google?
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted-2)]">
                      Мы не связываем аккаунты автоматически по email — так
                      чужой человек не сможет забрать ваш профиль.
                    </p>
                  </div>
                  <button
                    className="hover-accent w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent"
                    onClick={() => setGoogleStep("register")}
                    type="button"
                  >
                    Я новый — выбрать юз
                  </button>
                  <button
                    className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold hover:bg-white/5"
                    onClick={() => setGoogleStep("link")}
                    type="button"
                  >
                    У меня уже есть Dirami
                  </button>
                  <p className="text-center text-[11px] leading-4 text-[var(--muted-2)]">
                    Во втором варианте сохранятся чаты, профиль, NFT, галочка и
                    весь остальной прогресс.
                  </p>
                </div>
              ) : googleStep === "register" ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void completeGoogleSetup("register");
                  }}
                >
                  <div>
                    <h2 className="text-lg font-semibold">
                      Выберите юз Dirami
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted-2)]">
                      Google email не станет вашим публичным ником.
                    </p>
                  </div>
                  <input
                    autoComplete="username"
                    autoFocus
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
                    maxLength={24}
                    onChange={(event) => setGoogleNickname(event.target.value)}
                    placeholder="например, mara"
                    value={googleNickname}
                  />
                  {error ? <AuthError text={error} /> : null}
                  <button
                    className="hover-accent w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent disabled:opacity-60"
                    disabled={pending || !googleNickname.trim()}
                    type="submit"
                  >
                    {pending ? "Создаём…" : "Создать с Google"}
                  </button>
                  <button
                    className="w-full text-sm text-[var(--muted-2)]"
                    onClick={() => {
                      setGoogleStep("choice");
                      setError("");
                    }}
                    type="button"
                  >
                    Назад
                  </button>
                </form>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void completeGoogleSetup("link");
                  }}
                >
                  <div>
                    <h2 className="text-lg font-semibold">
                      Перенос существующего профиля
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-[var(--muted-2)]">
                      Один раз подтвердите старый ник и пароль. Мы привяжем
                      Google к тому же внутреннему профилю — ничего не пропадёт.
                    </p>
                  </div>
                  <input
                    autoComplete="username"
                    autoFocus
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
                    maxLength={24}
                    onChange={(event) =>
                      setExistingNickname(event.target.value)
                    }
                    placeholder="Ваш юз Dirami"
                    value={existingNickname}
                  />
                  <input
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
                    maxLength={72}
                    onChange={(event) =>
                      setExistingPassword(event.target.value)
                    }
                    placeholder="Текущий пароль"
                    type="password"
                    value={existingPassword}
                  />
                  {error ? <AuthError text={error} /> : null}
                  <button
                    className="hover-accent w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent disabled:opacity-60"
                    disabled={
                      pending || !existingNickname.trim() || !existingPassword
                    }
                    type="submit"
                  >
                    {pending ? "Переносим…" : "Сохранить прогресс и подключить"}
                  </button>
                  <button
                    className="w-full text-sm text-[var(--muted-2)]"
                    onClick={() => {
                      setGoogleStep("choice");
                      setError("");
                    }}
                    type="button"
                  >
                    Назад
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[var(--bg)] p-1">
                <button
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "bg-zinc-800 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  type="button"
                >
                  Вход
                </button>
                <button
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    mode === "register"
                      ? "bg-zinc-800 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  type="button"
                >
                  Регистрация
                </button>
              </div>

              <form className="space-y-4" onSubmit={onSubmit}>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-zinc-400">
                    Ник
                  </span>
                  <input
                    autoComplete="username"
                    autoFocus
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
                    maxLength={24}
                    name="nickname"
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="например, mara"
                    value={nickname}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-zinc-400">
                    Пароль
                  </span>
                  <input
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-base placeholder:text-[var(--muted-2)] focus:border-[var(--accent)]"
                    maxLength={72}
                    minLength={mode === "login" ? 6 : 8}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === "login" ? "ваш пароль" : "минимум 8 символов"
                    }
                    type="password"
                    value={password}
                  />
                </label>

                {error ? <AuthError text={error} /> : null}

                <button
                  className="hover-accent w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-[11px] text-[var(--muted-2)]">или</span>
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
              <GoogleSignInButton
                disabled={pending}
                onCredential={(credential) =>
                  void receiveGoogleCredential(credential)
                }
              />
              <p className="mt-3 text-center text-[11px] leading-4 text-[var(--muted-2)]">
                Новый пользователь после Google выберет собственный юз. Старый
                пользователь сможет безопасно перенести весь профиль.
              </p>
            </>
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
