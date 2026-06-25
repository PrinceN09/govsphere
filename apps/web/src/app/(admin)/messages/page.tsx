"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { ConversationList } from "@/components/collaboration/ConversationList";
import type { ConversationItem } from "@/components/collaboration/ConversationList";
import { apiGet } from "@/lib/api";

interface ApiConversation {
  lastReadAt: string;
  conversation: {
    id: string;
    type: "DIRECT" | "GROUP";
    name: string | null;
    avatarUrl: string | null;
    lastMessageAt: string | null;
    isArchived: boolean;
    members: {
      userId: string;
      user: { id: string; displayName: string; avatarUrl: string | null };
    }[];
  };
}

function toConversationItem(entry: ApiConversation, myId: string): ConversationItem {
  const { conversation, lastReadAt } = entry;
  let name = conversation.name ?? "Groupe";
  if (conversation.type === "DIRECT") {
    const other = conversation.members.find((m) => m.userId !== myId);
    name = other?.user.displayName ?? "Message direct";
  }
  const hasUnread =
    conversation.lastMessageAt !== null &&
    new Date(conversation.lastMessageAt) > new Date(lastReadAt);
  return {
    id: conversation.id,
    type: conversation.type,
    name,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: hasUnread ? 1 : 0,
    avatarUrl:
      conversation.type === "DIRECT"
        ? (conversation.members.find((m) => m.userId !== myId)?.user.avatarUrl ?? null)
        : conversation.avatarUrl,
  };
}

export default function MessagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["conversations", "mine"],
    queryFn: () => apiGet<ApiConversation[]>("/v1/conversations"),
  });

  const conversations = data ?? [];

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Messages"
        actions={
          <Link
            href="/admin/channels"
            className="inline-flex items-center rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            Parcourir les canaux
          </Link>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Messages directs</h2>
            <span className="text-xs text-slate-400">{conversations.length}</span>
          </div>
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center"><PageSpinner /></div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                items={conversations.map((c) => toConversationItem(c, ""))}
                basePath="/admin/direct"
                emptyLabel="Aucun message direct"
              />
            </div>
          )}
        </aside>
        <div className="flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
            </svg>
            <p className="mt-3 text-base font-medium text-slate-700">Sélectionnez une conversation</p>
            <p className="mt-1 text-sm text-slate-500">Choisissez un message à gauche ou démarrez une nouvelle conversation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
