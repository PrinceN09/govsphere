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
  labelOf = "sur",
  labelPage = "Page",
}: PaginationProps) {
  const start = Math.min((page - 1) * limit + 1, total);
  const end = Math.min(page * limit, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-sm">
      <span className="text-slate-500">
        {start}–{end} {labelOf} {total}
      </span>

      <div className="flex items-center gap-0.5">
        <NavButton
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </NavButton>

        {buildPageNumbers(page, totalPages).map((item, i) =>
          item === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-8 w-8 items-center justify-center text-slate-400 text-xs select-none"
            >
              ···
            </span>
          ) : (
            <NavButton key={item} onClick={() => onPageChange(item)} active={item === page}>
              {item}
            </NavButton>
          ),
        )}

        <NavButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Page suivante"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </NavButton>
      </div>

      <span className="text-slate-500">
        {labelPage} {page} {labelOf} {totalPages}
      </span>
    </div>
  );
}

function buildPageNumbers(page: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: Array<number | "…"> = [1];
  if (page > 3) pages.push("…");

  const rangeStart = Math.max(2, page - 1);
  const rangeEnd = Math.min(total - 1, page + 1);
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

  if (page < total - 2) pages.push("…");
  pages.push(total);

  return pages;
}

interface NavButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}

function NavButton({
  children,
  onClick,
  disabled,
  active,
  "aria-label": ariaLabel,
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 min-w-[2rem] items-center justify-center px-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-600 text-white"
          : "text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30",
      )}
    >
      {children}
    </button>
  );
}
