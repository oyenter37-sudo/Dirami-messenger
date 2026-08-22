"use client";

import { type ReactNode } from "react";
import { AppleEmoji } from "@/components/apple-emoji";
import { matchEmojiAt } from "@/lib/apple-emoji";

const DIRAMI = /^(dirami|дирами)/i;
const MENTION = /^@([\p{L}\p{N}_]{3,24})(?![\p{L}\p{N}_])/u;
const MENTION_CHAR = /[\p{L}\p{N}_]/u;
const CUSTOM_EF = "[e_f]";
const EF_SRC = "https://i.ibb.co/4nDpk1NL/images-11.jpg";

function parseText(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let buffer = "";
  let part = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push(buffer);
    buffer = "";
  };

  while (cursor < text.length) {
    if (text.startsWith(CUSTOM_EF, cursor)) {
      flush();
      nodes.push(
        <img
          alt=""
          className="ef-sticker"
          draggable={false}
          key={`${key}-f-${part}`}
          src={EF_SRC}
        />,
      );
      part += 1;
      cursor += CUSTOM_EF.length;
      continue;
    }

    const previous = cursor > 0 ? text[cursor - 1] : "";
    const mention =
      text[cursor] === "@" && (!previous || !MENTION_CHAR.test(previous))
        ? text.slice(cursor).match(MENTION)
        : null;
    if (mention) {
      flush();
      const nickname = mention[1];
      nodes.push(
        <a
          className="font-bold text-accent-soft underline decoration-accent-soft/35 underline-offset-2 transition hover:brightness-125"
          href={`/u/u/@${encodeURIComponent(nickname)}`}
          key={`${key}-u-${part}`}
          onClick={(event) => event.stopPropagation()}
          title={`Открыть профиль @${nickname}`}
        >
          {mention[0]}
        </a>,
      );
      part += 1;
      cursor += mention[0].length;
      continue;
    }

    const dirami = text.slice(cursor).match(DIRAMI);
    if (dirami) {
      flush();
      nodes.push(
        <span className="dirami-shimmer" key={`${key}-d-${part}`}>
          {dirami[0]}
        </span>,
      );
      part += 1;
      cursor += dirami[0].length;
      continue;
    }

    const emoji = matchEmojiAt(text, cursor);
    if (emoji) {
      flush();
      nodes.push(<AppleEmoji emoji={emoji} key={`${key}-e-${part}`} />);
      part += 1;
      cursor += emoji.length;
      continue;
    }

    buffer += text[cursor];
    cursor += 1;
  }

  flush();
  return nodes;
}

function parseMarkdown(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let buffer = "";
  let part = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push(...parseText(buffer, `${key}-t${part}`));
    part += 1;
    buffer = "";
  };

  const wrap = (endToken: string, className: string, offset: number) => {
    const end = text.indexOf(endToken, cursor + offset);
    if (end === -1) return false;
    flush();
    nodes.push(
      <span className={className} key={`${key}-m${part}`}>
        {parseMarkdown(text.slice(cursor + offset, end), `${key}-n${part}`)}
      </span>,
    );
    part += 1;
    cursor = end + offset;
    return true;
  };

  while (cursor < text.length) {
    const previous = cursor > 0 ? text[cursor - 1] : "";
    const mention =
      text[cursor] === "@" && (!previous || !MENTION_CHAR.test(previous))
        ? text.slice(cursor).match(MENTION)
        : null;
    if (mention) {
      flush();
      nodes.push(...parseText(mention[0], `${key}-u${part}`));
      part += 1;
      cursor += mention[0].length;
      continue;
    }

    if (text.startsWith("**", cursor) && wrap("**", "font-bold", 2)) continue;
    if (
      text.startsWith("__", cursor) &&
      wrap("__", "underline underline-offset-2", 2)
    ) {
      continue;
    }
    if (text[cursor] === "*" && wrap("*", "italic", 1)) continue;
    if (text[cursor] === "_" && wrap("_", "italic", 1)) continue;
    buffer += text[cursor];
    cursor += 1;
  }

  flush();
  return nodes;
}

export function RichText({ text }: { text: string }) {
  return <>{parseMarkdown(text, "r")}</>;
}
