"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use } from "react";

import type { ChatMessage } from "@/components/collaboration/ChatWindow";

import { ChatWindow } from "@/components/collaboration/ChatWindow";
import { MessageComposer } from "@/components/collaboration/MessageComposer";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

interface Channel {
  id: string;
  name: string;
  type: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT";
  description: string | null;
  memberCount: number;
  members: { userId: string; isAdmin: boolean; user: { id: string; displayName: string } }[];
}

interface MessagesResponse {
  data: ChatMessage[];
  nextBefore: string | null;
  hasMore: boolean;
}

export default function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: () => apiGet<Channel>(`/v1/channels/${id}`),
  });

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ["channel-messages", id],
    queryFn: () => apiGet<MessagesResponse>(`/v1/channels/${id}/messages?limit=50`),
    refetchInterval: 5_000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) => apiPost(`/v1/channels/${id}/messages`, { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["channel-messages", id] });
    },
  });

  const reactMsg = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiPost(`/v1/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["channel-messages", id] });
    },
  });

  const deleteMsg = useMutation({
    mutationFn: (messageId: string) => apiDelete(`/v1/messages/${messageId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["channel-messages", id] });
    },
  });

  if (channelLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageSpinner />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">Canal introuvable.</p>
      </div>
    );
  }

  const typeLabel =
    channel.type === "ANNOUNCEMENT" ? "Annonces" : channel.type === "PRIVATE" ? "Privé" : "Public";
  const messages = messagesData?.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title={`# ${channel.name}`}
        subtitle={channel.description ?? `${channel.memberCount} membres · ${typeLabel}`}
        actions={<Badge variant={channel.type === "PUBLIC" ? "blue" : "gray"}>{typeLabel}</Badge>}
      />

      <ChatWindow
        messages={messages}
        currentUserId=""
        isLoading={msgsLoading}
        onReact={(messageId, emoji) => reactMsg.mutate({ messageId, emoji })}
        onDelete={(messageId) => deleteMsg.mutate(messageId)}
      />

      <MessageComposer
        onSend={async (content) => {
          await sendMsg.mutateAsync(content);
        }}
        placeholder={`Message # ${channel.name}`}
        disabled={channel.type === "ANNOUNCEMENT"}
      />
    </div>
  );
}
