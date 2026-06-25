"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { use } from "react";

import type { ChatMessage } from "@/components/collaboration/ChatWindow";
import type { PresenceStatus } from "@/components/collaboration/PresenceBadge";

import { ChatWindow } from "@/components/collaboration/ChatWindow";
import { MessageComposer } from "@/components/collaboration/MessageComposer";
import { PresenceBadge } from "@/components/collaboration/PresenceBadge";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";

interface DirectMessage {
  id: string;
  content: string;
  type: string;
  replyToId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl: string | null };
  reactions: { emoji: string; userId: string }[];
}

interface MessagesResponse {
  data: DirectMessage[];
  nextBefore: string | null;
  hasMore: boolean;
}

interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  members: {
    userId: string;
    lastReadAt: string;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }[];
}

interface PresenceState {
  userId: string;
  status: PresenceStatus;
}

export default function DirectMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const myId = session?.user.id ?? "";
  const qc = useQueryClient();

  const { data: conv, isLoading: convLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => apiGet<Conversation>(`/v1/conversations/${id}`),
  });

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ["dm-messages", id],
    queryFn: () => apiGet<MessagesResponse>(`/v1/conversations/${id}/messages?limit=50`),
    refetchInterval: 3_000,
  });

  const send = useMutation({
    mutationFn: (content: string) => apiPost(`/v1/conversations/${id}/messages`, { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dm-messages", id] });
      void apiPost(`/v1/conversations/${id}/read`, {});
    },
  });

  const otherId = conv?.members.find((m) => m.userId !== myId)?.userId;
  const { data: presence } = useQuery({
    queryKey: ["presence", otherId],
    queryFn: () => apiGet<PresenceState>(`/v1/presence/${otherId!}`),
    enabled: !!otherId,
    refetchInterval: 30_000,
  });

  if (convLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageSpinner />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">Conversation introuvable.</p>
      </div>
    );
  }

  const isDirect = conv.type === "DIRECT";
  const otherUser = isDirect ? conv.members.find((m) => m.userId !== myId)?.user : null;
  const title = isDirect ? (otherUser?.displayName ?? "Message direct") : (conv.name ?? "Groupe");

  const messages: ChatMessage[] = (messagesData?.data ?? []).map((dm) => ({
    id: dm.id,
    content: dm.content,
    editedAt: dm.editedAt,
    deletedAt: dm.deletedAt,
    createdAt: dm.createdAt,
    sender: dm.sender,
    reactions: dm.reactions,
  }));

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title={title}
        actions={presence ? <PresenceBadge status={presence.status} showLabel /> : undefined}
      />

      <ChatWindow messages={messages} currentUserId={myId} isLoading={msgsLoading} />

      <MessageComposer
        onSend={async (content) => {
          await send.mutateAsync(content);
        }}
        placeholder={`Message ${isDirect ? (otherUser?.displayName ?? "") : title}`}
      />
    </div>
  );
}
