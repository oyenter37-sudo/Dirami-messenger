"use client";

import { type ReactNode } from "react";
import { AppleEmoji } from "@/components/apple-emoji";
import { matchEmojiAt } from "@/lib/apple-emoji";

const DIRAMI = /^(dirami|дирами)/i;
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
          className="apple-emoji"
          draggable={false}
          key={`${key}-f-${part}`}
          src={EF_SRC}
        />,
      );
      part += 1;
      cursor += CUSTOM_EF.length;
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
    if (text.startsWith("**", cursor) && wrap("**", "font-bold", 2)) continue;
    if (text.startsWith("__", cursor) && wrap("__", "underline underline-offset-2", 2)) {
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
