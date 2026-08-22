"use client";

import { type MouseEventHandler, useState } from "react";
import { avatarColor, initials } from "@/lib/avatar";

type Props = {
  nickname: string;
  avatarUrl?: string | null;
  className?: string;
  imageClassName?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  title?: string;
};

export function UserAvatar({
  nickname,
  avatarUrl,
  className = "",
  imageClassName = "",
  onClick,
  title,
}: Props) {
  const [failedUrl, setFailedUrl] = useState("");
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden font-extrabold text-white ${
        showImage ? "bg-[var(--panel)]" : avatarColor(nickname)
      } ${className}`}
      onClick={onClick}
      title={title}
    >
      {showImage ? (
        <img
          alt={`Аватар ${nickname}`}
          className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
          draggable={false}
          onError={() => setFailedUrl(avatarUrl ?? "")}
          src={avatarUrl ?? ""}
        />
      ) : (
        initials(nickname)
      )}
    </span>
  );
}
