import type { CSSProperties } from "react";
import { RichText } from "@/components/rich-text";
import type {
  HyperBadgeStyle,
  HyperNameStyle,
  HyperVerificationAppearance,
} from "@/lib/types";

type Props = {
  name: string;
  isVerified?: boolean;
  isHyperVerified?: boolean;
  hyperAppearance?: Partial<HyperVerificationAppearance>;
  className?: string;
  truncate?: boolean;
};

function safeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function badgeStyle(value: string | undefined): HyperBadgeStyle {
  return value === "hidden" || value === "classic" ? value : "special";
}

function nameStyle(value: string | undefined): HyperNameStyle {
  if (value === "plain" || value === "verified" || value === "custom") {
    return value;
  }
  return "rainbow";
}

function VerificationIcon({ label, color }: { label: string; color: string }) {
  return (
    <svg
      aria-label={label}
      className="verification-icon"
      fill="currentColor"
      role="img"
      style={{
        color,
        filter: `drop-shadow(0 0 5px ${color})`,
      }}
      viewBox="0 0 20 20"
    >
      <path d="M10 1.7 12 3l2.4-.1.9 2.2 2 1.3-.5 2.4.9 2.2-1.7 1.7-.3 2.4-2.4.5-1.7 1.7-2.2-.9-2.4.5-1.3-2-2.2-.9.1-2.4L2.3 10l.9-2.2-.5-2.4 2-1.3.9-2.2L8 3l2-1.3Z" />
      <path
        d="m6.7 10.1 2.1 2.1 4.5-4.6"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function VerifiedName({
  name,
  isVerified = false,
  isHyperVerified = false,
  hyperAppearance,
  className = "",
  truncate = false,
}: Props) {
  const hyperBadgeStyle = badgeStyle(hyperAppearance?.hyperBadgeStyle);
  const hyperNameStyle = nameStyle(hyperAppearance?.hyperNameStyle);
  const hyperBadgeColor = safeColor(
    hyperAppearance?.hyperBadgeColor,
    "#a855f7",
  );
  const hyperNameColor = safeColor(hyperAppearance?.hyperNameColor, "#f8fafc");
  const hyperNameGlow = safeColor(hyperAppearance?.hyperNameGlow, "#a855f7");
  const showHyperBadge = isHyperVerified && hyperBadgeStyle !== "hidden";
  const hasBadges = isVerified || showHyperBadge;

  let nameClassName = "";
  let customNameStyle: CSSProperties | undefined;
  if (isHyperVerified) {
    if (hyperNameStyle === "rainbow") {
      nameClassName = "hyper-verified-name";
    } else if (hyperNameStyle === "verified") {
      nameClassName =
        "text-sky-300 [text-shadow:0_0_12px_rgba(56,189,248,.42)]";
    } else if (hyperNameStyle === "custom") {
      customNameStyle = {
        color: hyperNameColor,
        textShadow: `0 0 7px ${hyperNameGlow}, 0 0 15px ${hyperNameGlow}99`,
      };
    }
  } else if (isVerified) {
    nameClassName = "text-sky-300 [text-shadow:0_0_12px_rgba(56,189,248,.42)]";
  }

  return (
    <span
      className={`relative inline-flex min-w-0 max-w-full items-center gap-1 overflow-visible align-middle ${className}`}
    >
      <span
        className={`${truncate ? "min-w-0 truncate" : ""} ${nameClassName}`}
        style={customNameStyle}
      >
        <RichText text={name} />
      </span>
      {hasBadges ? (
        <span className="verified-badges">
          {isVerified ? (
            <VerificationIcon
              color="#38bdf8"
              label="Подтверждённый пользователь"
            />
          ) : null}
          {showHyperBadge && hyperBadgeStyle === "classic" ? (
            <VerificationIcon
              color={hyperBadgeColor}
              label="Гиперподтверждённый пользователь"
            />
          ) : null}
          {showHyperBadge && hyperBadgeStyle === "special" ? (
            <span
              aria-label="Гиперподтверждённый пользователь"
              className="hyper-verified-badge"
              role="img"
              title="Гиперподтверждение"
            >
              <span aria-hidden="true">✓</span>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
