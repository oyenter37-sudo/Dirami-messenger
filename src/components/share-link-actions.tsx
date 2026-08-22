"use client";

import { useState } from "react";

type Props = {
  path: string;
  title: string;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function ShareLinkActions({ path, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState("");

  function publicUrl() {
    return new URL(path, window.location.origin).toString();
  }

  async function copy() {
    try {
      await copyText(publicUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function showQr() {
    setQrError("");
    try {
      const QRCode = await import("qrcode");
      const image = await QRCode.toDataURL(publicUrl(), {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#071116", light: "#ffffff" },
      });
      setQr(image);
    } catch {
      setQrError("Не удалось создать QR-код");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-xs font-bold hover:bg-white/5"
          onClick={() => void copy()}
          type="button"
        >
          {copied ? "Ссылка скопирована" : "Копировать ссылку"}
        </button>
        <button
          className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-xs font-bold hover:bg-white/5"
          onClick={() => void showQr()}
          type="button"
        >
          Показать QR
        </button>
      </div>
      {qrError ? <p className="mt-2 text-xs text-red-300">{qrError}</p> : null}

      {qr ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-3 sm:items-center"
          onClick={() => setQr("")}
        >
          <section
            className="w-full max-w-sm rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-5 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 text-left">
              <div>
                <p className="text-[10px] font-black tracking-[0.13em] text-accent-soft uppercase">
                  Поделиться
                </p>
                <h3 className="mt-1 text-lg font-black">{title}</h3>
              </div>
              <button
                aria-label="Закрыть QR-код"
                className="grid size-10 place-items-center rounded-full border border-[var(--border)] text-2xl"
                onClick={() => setQr("")}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="mx-auto mt-5 w-fit rounded-[1.5rem] bg-white p-3 shadow-xl">
              {/* Data URL is generated locally and never sent to a third party. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`QR-код: ${title}`} className="size-64" src={qr} />
            </div>
            <p className="mt-4 break-all text-[10px] leading-4 text-[var(--muted-2)]">
              {publicUrl()}
            </p>
            <button
              className="hover-accent mt-4 w-full rounded-full bg-accent py-3 text-sm font-black text-on-accent"
              onClick={() => void copy()}
              type="button"
            >
              {copied ? "Скопировано" : "Скопировать ссылку"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
