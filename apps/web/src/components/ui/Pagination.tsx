"use client";

import { cn } from "./cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  labelOf?: string;
  labelPage?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  labelOf = "of",
  labelPage = "Page",
}: PaginationProps) {
  const start = Math.min((page - 1) * limit + 1, total);
  const end = Math.min(page * limit, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
      <span>
        {start}–{end} {labelOf} {total}
      </span>
      <div className="flex items-center gap-1">
        <PageButton
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          ‹
        </PageButton>

        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          // Show first, last, current ±1, and ellipsis
          let pageNum: number | "…";
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (i === 0) {
            pageNum = 1;
          } else if (i === 6) {
            pageNum = totalPages;
          } else if (i === 1 && page > 4) {
            pageNum = "…";
          } else if (i === 5 && page < totalPages - 3) {
            pageNum = "…";
          } else {
            const offset = page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 2 + (i - 2);
            pageNum = Math.max(1, Math.min(totalPages, offset));
          }

          if (pageNum === "…") {
            return (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
                …
              </span>
            );
          }

          return (
            <PageButton
              key={pageNum}
              onClick={() => onPageChange(pageNum as number)}
              active={pageNum === page}
            >
              {pageNum}
            </PageButton>
          );
        })}

        <PageButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          ›
        </PageButton>
      </div>
      <span>
        {labelPage} {page} {labelOf} {totalPages}
      </span>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-600 text-white"
          : "text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
