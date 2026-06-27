"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

import { cn } from "@/components/ui/cn";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResultItem {
  id: string;
  displayName?: string;
  title?: string;
  email?: string;
  role?: string;
  type?: string;
  status?: string;
  startTime?: string;
  dueDate?: string;
  assignee?: { displayName: string };
  author?: { displayName: string };
  organizer?: { displayName: string };
  initiator?: { displayName: string };
}

interface SearchGroup {
  type: string;
  label: string;
  items: SearchResultItem[];
  count: number;
}

interface SearchResponse {
  q: string;
  totalHits: number;
  results: Record<string, SearchGroup>;
}

// ─── Route resolver ───────────────────────────────────────────────────────────

function getRoute(groupType: string, item: SearchResultItem): string {
  switch (groupType) {
    case "users":
      return `/admin/employees/${item.id}`;
    case "documents":
      return `/admin/documents/${item.id}`;
    case "meetings":
      return `/admin/meetings/${item.id}`;
    case "workflows":
      return `/admin/workflows/${item.id}`;
    case "tasks":
      return `/admin/tasks/${item.id}`;
    default:
      return "#";
  }
}

function getLabel(item: SearchResultItem): string {
  return item.displayName ?? item.title ?? item.id;
}

function getSublabel(groupType: string, item: SearchResultItem): string {
  switch (groupType) {
    case "users":
      return `${item.email ?? ""} · ${item.role ?? ""}`;
    case "documents":
      return `${item.type ?? ""} · ${item.status ?? ""}`;
    case "meetings":
      return item.startTime ? new Date(item.startTime).toLocaleDateString("fr-FR") : "";
    case "workflows":
      return `${item.status ?? ""} · par ${item.initiator?.displayName ?? ""}`;
    case "tasks":
      return `${item.status ?? ""} · ${item.assignee?.displayName ?? ""}`;
    default:
      return "";
  }
}

// ─── Flatten results into a flat list for keyboard nav ───────────────────────

interface FlatResult {
  groupType: string;
  groupLabel: string;
  item: SearchResultItem;
  route: string;
}

function flattenResults(results: Record<string, SearchGroup>): FlatResult[] {
  const flat: FlatResult[] = [];
  for (const group of Object.values(results)) {
    for (const item of group.items) {
      flat.push({
        groupType: group.type,
        groupLabel: group.label,
        item,
        route: getRoute(group.type, item),
      });
    }
  }
  return flat;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debouncedQuery = useDebounce(query, 250);

  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => apiGet<SearchResponse>(`/v1/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 1,
    staleTime: 10_000,
  });

  const flat = data ? flattenResults(data.results) : [];

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [data]);

  // Keyboard handler
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flat[selectedIndex]) {
        router.push(flat[selectedIndex].route);
        onClose();
      }
    },
    [open, flat, selectedIndex, router, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) return null;

  // Group results for rendering
  const groups = data ? Object.values(data.results).filter((g) => g.items.length > 0) : [];
  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl overflow-hidden border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <svg
            className="h-4 w-4 flex-shrink-0 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher agents, documents, réunions, workflows…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {isFetching && (
            <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          <kbd className="hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Commencez à taper pour rechercher…
            </div>
          ) : debouncedQuery.length > 0 && !isFetching && groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.type}>
                <div className="sticky top-0 bg-slate-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-t border-slate-100">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        isSelected ? "bg-primary-50" : "hover:bg-slate-50",
                      )}
                      onClick={() => {
                        router.push(getRoute(group.type, item));
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {getLabel(item)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {getSublabel(group.type, item)}
                        </p>
                      </div>
                      {isSelected && (
                        <kbd className="flex-shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 mt-0.5">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2">
          <span className="text-[10px] text-slate-400">
            <kbd className="font-medium">↑↓</kbd> naviguer
          </span>
          <span className="text-[10px] text-slate-400">
            <kbd className="font-medium">↵</kbd> ouvrir
          </span>
          <span className="text-[10px] text-slate-400">
            <kbd className="font-medium">ESC</kbd> fermer
          </span>
          {data && data.totalHits > 0 && (
            <span className="ml-auto text-[10px] text-slate-400">{data.totalHits} résultat(s)</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── useCommandPalette hook ───────────────────────────────────────────────────

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen, close: () => setOpen(false) };
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
