import { RichText } from "@/components/rich-text";

type Props = {
  name: string;
  isVerified?: boolean;
  className?: string;
  truncate?: boolean;
};

export function VerifiedName({
  name,
  isVerified = false,
  className = "",
  truncate = false,
}: Props) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 align-middle ${className}`}
    >
      <span
        className={`${truncate ? "truncate" : ""} ${
          isVerified
            ? "text-sky-300 [text-shadow:0_0_12px_rgba(56,189,248,.42)]"
            : ""
        }`}
      >
        <RichText text={name} />
      </span>
      {isVerified ? (
        <svg
          aria-label="Верифицированный пользователь"
          className="size-[1em] shrink-0 overflow-visible text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,.55)]"
          fill="currentColor"
          role="img"
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
      ) : null}
    </span>
  );
}
