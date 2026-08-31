"use client";

type CountProps = {
  count?: number;
};

export function SearchSkeleton({ count = 4 }: CountProps) {
  return (
    <div aria-hidden="true" className="space-y-1 px-1.5">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="flex items-center gap-3 rounded-2xl px-2.5 py-2"
          key={index}
        >
          <span className="skel size-10 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="skel block h-3 w-2/5" />
            <span className="skel block h-2.5 w-3/5" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function NewsSkeleton({ count = 3 }: CountProps) {
  return (
    <div aria-hidden="true" className="mt-5 space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-4"
          key={index}
        >
          <div className="flex items-center gap-2.5">
            <span className="skel size-9 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="skel block h-2.5 w-1/3" />
              <span className="skel block h-2 w-1/4" />
            </span>
          </div>
          <span className="skel mt-3.5 block h-3.5 w-3/4" />
          <span className="skel mt-2.5 block h-2.5 w-full" />
          <span className="skel mt-1.5 block h-2.5 w-11/12" />
        </div>
      ))}
    </div>
  );
}

export function NftSkeleton({ count = 3 }: CountProps) {
  return (
    <div aria-hidden="true" className="mt-3 space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg)] p-2.5"
          key={index}
        >
          <div className="flex gap-3">
            <span className="skel size-16 shrink-0 rounded-2xl" />
            <span className="min-w-0 flex-1 space-y-2 py-0.5">
              <span className="skel block h-3 w-1/2" />
              <span className="skel block h-2.5 w-1/4" />
              <span className="skel block h-2 w-3/5" />
            </span>
          </div>
          <span className="skel mt-2.5 block h-9 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ count = 4 }: CountProps) {
  return (
    <div aria-hidden="true" className="space-y-2.5">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[var(--border)] bg-[var(--panel)] px-4 py-3.5"
          key={index}
        >
          <span className="min-w-0 space-y-1.5">
            <span className="skel block h-3 w-32" />
            <span className="skel block h-2 w-20" />
          </span>
          <span className="skel h-3 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}
