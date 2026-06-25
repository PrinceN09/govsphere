"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PresenceBadge } from "./PresenceBadge";
import { UnreadBadge } from "./UnreadBadge";

import type { PresenceStatus } from "./PresenceBadge";

import { cn } from "@/components/ui/cn";

export interface ConversationItem {
  id: string;
  type: "DIRECT" | "GROUP" | "CHANNEL";
  name: string;
  lastMessage?: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
  avatarUrl?: string | null;
  presenceStatus?: PresenceStatus;
  memberCount?: number;
}

interface ConversationListProps {
  items: ConversationItem[];
  basePath: string;
  emptyLabel?: string;
}

function RelativeTime({ iso }: { iso: string }) {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return <span>maintenant</span>;
  if (minutes < 60) return <span>{minutes}m</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <span>{hours}h</span>;
  const days = Math.floor(hours / 24);
  return <span>{days}j</span>;
}

function ItemAvatar({
  name,
  url,
  presenceStatus,
}: {
  name: string;
  url?: string | null;
  presenceStatus?: PresenceStatus;
}) {
  return (
    <div className="relative flex-shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {presenceStatus && (
        <span className="absolute -bottom-0.5 -right-0.5">
          <PresenceBadge status={presenceStatus} />
        </span>
      )}
    </div>
  );
}

export function ConversationList({
  items,
  basePath,
  emptyLabel = "Aucune conversation",
}: ConversationListProps) {
  const pathname = usePathname();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const href = `${basePath}/${item.id}`;
        const isActive = pathname === href;

        return (
          <li key={item.id}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50",
                isActive && "bg-primary-50 hover:bg-primary-50",
              )}
            >
              <ItemAvatar
                name={item.name}
                {...(item.avatarUrl !== undefined ? { url: item.avatarUrl } : {})}
                {...(item.presenceStatus !== undefined
                  ? { presenceStatus: item.presenceStatus }
                  : {})}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={cn(
                      "truncate text-sm",
                      (item.unreadCount ?? 0) > 0
                        ? "font-semibold text-slate-900"
                        : "font-medium text-slate-700",
                      isActive && "text-primary-700",
                    )}
                  >
                    {item.name}
                  </span>
                  {item.lastMessageAt && (
                    <span className="flex-shrink-0 text-[10px] text-slate-400">
                      <RelativeTime iso={item.lastMessageAt} />
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs text-slate-500">{item.lastMessage ?? ""}</p>
                  {(item.unreadCount ?? 0) > 0 && (
                    <UnreadBadge count={item.unreadCount!} className="flex-shrink-0" />
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
