"use client";

/**
 * Prinodia Chat v1.4.0 — Unified Chat Hub
 *
 * Layout:  [ChatSidebar 260px] | [ChatMain flex-1]
 * URL:     /admin/chat?channel=<id>   — open a channel
 *          /admin/chat?dm=<id>        — open a DM / group conversation
 *
 * Uses existing v1 API endpoints:
 *   GET /v1/channels/mine
 *   GET /v1/conversations
 *   GET /v1/channels/:id/messages
 *   GET /v1/conversations/:id/messages
 *   POST /v1/channels/:channelId/messages
 *   POST /v1/conversations/:id/messages
 *   POST /v1/messages/:id/reactions
 *   DELETE /v1/messages/:id
 *   GET /v1/messages/:id/thread
 *   GET /v1/channels/:id/draft
 *   PUT /v1/channels/:id/draft
 *   DELETE /v1/channels/:id/draft
 *   GET /v1/bookmarks
 *   POST /v1/bookmarks
 *   DELETE /v1/bookmarks/:id
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  slug: string;
  type: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT" | "DEPARTMENT" | "ORGANIZATION" | "PROJECT";
  description: string | null;
  memberCount: number;
  lastMessageAt: string | null;
}

interface ConversationEntry {
  lastReadAt: string;
  conversation: {
    id: string;
    type: "DIRECT" | "GROUP";
    name: string | null;
    avatarUrl: string | null;
    lastMessageAt: string | null;
    members: {
      userId: string;
      user: { id: string; displayName: string; avatarUrl: string | null };
    }[];
  };
}

interface ChatMsg {
  id: string;
  content: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl: string | null };
  replyTo?: { id: string; content: string; sender: { id: string; displayName: string } } | null;
  reactions?: { emoji: string; userId: string }[];
  _count?: { replies: number };
}

interface ThreadMsg {
  id: string;
  content: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl: string | null };
  reactions?: { emoji: string; userId: string }[];
}

interface Bookmark {
  id: string;
  messageId: string | null;
  dmId: string | null;
  note: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "✅"];

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  name,
  url,
  size = 32,
  className = "",
}: {
  name: string;
  url: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        unoptimized
      />
    );
  }
  const px = `${size}px`;
  return (
    <span
      style={{ width: px, height: px, fontSize: size * 0.38 }}
      className={`rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {initials(name)}
    </span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function ChatSidebar({
  myId,
  activeChannel,
  activeDm,
  onSelectChannel,
  onSelectDm,
}: {
  myId: string;
  activeChannel: string | null;
  activeDm: string | null;
  onSelectChannel: (id: string) => void;
  onSelectDm: (id: string) => void;
}) {
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["chat-my-channels"],
    queryFn: () => apiGet<Channel[]>("/v1/channels/mine"),
    refetchInterval: 60_000,
  });

  const { data: conversations = [] } = useQuery<ConversationEntry[]>({
    queryKey: ["chat-conversations"],
    queryFn: () => apiGet<ConversationEntry[]>("/v1/conversations"),
    refetchInterval: 10_000,
  });

  function dmName(entry: ConversationEntry) {
    if (entry.conversation.type === "DIRECT") {
      const other = entry.conversation.members.find((m) => m.userId !== myId);
      return other?.user.displayName ?? "Message direct";
    }
    return entry.conversation.name ?? "Groupe";
  }

  function dmAvatar(entry: ConversationEntry): string | null {
    if (entry.conversation.type === "DIRECT") {
      return entry.conversation.members.find((m) => m.userId !== myId)?.user.avatarUrl ?? null;
    }
    return entry.conversation.avatarUrl;
  }

  function hasUnread(entry: ConversationEntry) {
    return (
      entry.conversation.lastMessageAt !== null &&
      new Date(entry.conversation.lastMessageAt) > new Date(entry.lastReadAt)
    );
  }

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col bg-[var(--sidebar-bg)] border-r border-border overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-sm font-semibold text-foreground">Prinodia Chat</h1>
      </div>

      {/* Channels */}
      <div className="mt-2">
        <button
          onClick={() => setChannelsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide hover:text-foreground"
        >
          <span>Canaux</span>
          <span>{channelsOpen ? "▾" : "▸"}</span>
        </button>

        {channelsOpen && (
          <div className="mt-0.5 space-y-0.5">
            {channels.length === 0 && (
              <p className="px-4 py-2 text-xs text-muted italic">Aucun canal rejoint</p>
            )}
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left rounded-none transition-colors ${
                  activeChannel === ch.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <span className="text-muted">#</span>
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Direct messages */}
      <div className="mt-4">
        <button
          onClick={() => setDmsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide hover:text-foreground"
        >
          <span>Messages directs</span>
          <span>{dmsOpen ? "▾" : "▸"}</span>
        </button>

        {dmsOpen && (
          <div className="mt-0.5 space-y-0.5">
            {conversations.length === 0 && (
              <p className="px-4 py-2 text-xs text-muted italic">Aucune conversation</p>
            )}
            {conversations.map((entry) => {
              const name = dmName(entry);
              const avatar = dmAvatar(entry);
              const unread = hasUnread(entry);
              return (
                <button
                  key={entry.conversation.id}
                  onClick={() => onSelectDm(entry.conversation.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left rounded-none transition-colors ${
                    activeDm === entry.conversation.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Avatar name={name} url={avatar} size={22} />
                  <span
                    className={`truncate flex-1 ${unread ? "font-semibold text-foreground" : ""}`}
                  >
                    {name}
                  </span>
                  {unread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  myId,
  bookmarkedIds,
  onReact,
  onDelete,
  onReply,
  onOpenThread,
  onBookmark,
  onUnbookmark,
}: {
  msg: ChatMsg;
  isOwn: boolean;
  myId: string;
  bookmarkedIds: Set<string>;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onReply: () => void;
  onOpenThread: () => void;
  onBookmark: () => void;
  onUnbookmark: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const isBookmarked = bookmarkedIds.has(msg.id);

  if (msg.deletedAt) {
    return (
      <div className="px-4 py-1">
        <span className="text-xs italic text-muted">[Message supprimé]</span>
      </div>
    );
  }

  const reactionGroups = (msg.reactions ?? []).reduce<
    Record<string, { count: number; mine: boolean }>
  >((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
    acc[r.emoji]!.count++;
    if (r.userId === myId) acc[r.emoji]!.mine = true;
    return acc;
  }, {});

  return (
    <div
      className="group relative flex gap-3 px-4 py-1.5 hover:bg-surface-hover transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowEmojis(false);
      }}
    >
      {/* Avatar */}
      <div className="pt-0.5 flex-shrink-0">
        <Avatar name={msg.sender.displayName} url={msg.sender.avatarUrl} size={36} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-sm font-semibold text-foreground">{msg.sender.displayName}</span>
          <span className="text-[11px] text-muted">{formatTime(msg.createdAt)}</span>
          {msg.editedAt && <span className="text-[10px] text-muted italic">(modifié)</span>}
        </div>

        {/* Reply preview */}
        {msg.replyTo && (
          <div className="mb-1 flex items-start gap-1.5 pl-3 border-l-2 border-border text-xs text-muted">
            <span className="font-medium">{msg.replyTo.sender.displayName}:</span>
            <span className="truncate">{msg.replyTo.content}</span>
          </div>
        )}

        {/* Body */}
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </p>

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  mine
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary hover:bg-surface-hover"
                }`}
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count */}
        {(msg._count?.replies ?? 0) > 0 && (
          <button onClick={onOpenThread} className="mt-1 text-xs text-primary hover:underline">
            {msg._count!.replies} réponse{msg._count!.replies > 1 ? "s" : ""} →
          </button>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute right-4 top-1 flex items-center gap-0.5 bg-surface border border-border rounded-md shadow-sm px-1 py-0.5 z-10">
          {/* Emoji picker toggle */}
          <div className="relative">
            <button
              onClick={() => setShowEmojis((s) => !s)}
              className="p-1.5 rounded hover:bg-surface-hover text-muted hover:text-foreground text-sm"
              title="Réagir"
            >
              😊
            </button>
            {showEmojis && (
              <div className="absolute right-0 top-8 flex gap-1 bg-surface border border-border rounded-lg px-2 py-1.5 shadow-md z-20">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      onReact(e);
                      setShowEmojis(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply in thread */}
          <button
            onClick={onOpenThread}
            className="p-1.5 rounded hover:bg-surface-hover text-muted hover:text-foreground text-xs"
            title="Fil de discussion"
          >
            💬
          </button>

          {/* Reply (set replyTo) */}
          <button
            onClick={onReply}
            className="p-1.5 rounded hover:bg-surface-hover text-muted hover:text-foreground text-xs"
            title="Répondre"
          >
            ↩
          </button>

          {/* Bookmark */}
          <button
            onClick={isBookmarked ? onUnbookmark : onBookmark}
            className={`p-1.5 rounded hover:bg-surface-hover text-xs ${
              isBookmarked ? "text-yellow-500" : "text-muted hover:text-foreground"
            }`}
            title={isBookmarked ? "Retirer le signet" : "Sauvegarder"}
          >
            {isBookmarked ? "★" : "☆"}
          </button>

          {/* Delete (own messages only) */}
          {isOwn && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-600 text-xs"
              title="Supprimer"
            >
              🗑
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Message composer ──────────────────────────────────────────────────────────

function Composer({
  onSend,
  placeholder,
  disabled,
  replyTo,
  onClearReply,
}: {
  onSend: (content: string) => Promise<void>;
  placeholder: string;
  disabled?: boolean;
  replyTo: ChatMsg | null;
  onClearReply: () => void;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 pl-3 border-l-2 border-primary bg-primary/5 rounded-r-md py-1.5 pr-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary">{replyTo.sender.displayName}</span>
            <p className="text-xs text-muted truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onClearReply}
            className="text-muted hover:text-foreground text-xs flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 bg-surface border border-border rounded-xl px-3 py-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Lecture seule" : placeholder}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none min-h-[24px] max-h-[160px]"
          style={{ height: "auto" }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
          }}
        />
        <button
          onClick={() => void handleSend()}
          disabled={!value.trim() || disabled || sending}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 rotate-90"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-[10px] text-muted">
        Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
      </p>
    </div>
  );
}

// ─── Thread panel ──────────────────────────────────────────────────────────────

function ThreadPanel({
  parentId,
  myId,
  onClose,
}: {
  parentId: string;
  myId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: thread = [], isLoading } = useQuery<ThreadMsg[]>({
    queryKey: ["thread", parentId],
    queryFn: () => apiGet<ThreadMsg[]>(`/v1/messages/${parentId}/thread`),
    refetchInterval: 5_000,
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const parent = thread[0];
      if (!parent) return;
      return apiPost(
        `/v1/channels/${(parent as unknown as { channelId?: string }).channelId}/messages`,
        {
          content,
          replyToId: parentId,
        },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["thread", parentId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Fil de discussion</span>
        <button onClick={onClose} className="text-muted hover:text-foreground text-sm">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-border rounded animate-pulse" />
            ))}
          </div>
        ) : thread.length === 0 ? (
          <p className="p-6 text-center text-muted text-sm">Aucune réponse pour l&#39;instant.</p>
        ) : (
          <div className="py-2">
            {thread.map((m) => (
              <div key={m.id} className="flex gap-2.5 px-4 py-2 hover:bg-surface-hover">
                <Avatar name={m.sender.displayName} url={m.sender.avatarUrl} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold">{m.sender.displayName}</span>
                    <span className="text-[10px] text-muted">{formatTime(m.createdAt)}</span>
                  </div>
                  {m.deletedAt ? (
                    <span className="text-xs italic text-muted">[supprimé]</span>
                  ) : (
                    <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-1 border-t border-border">
        <div className="flex items-end gap-2 bg-surface border border-border rounded-lg px-2 py-1.5">
          <textarea
            rows={1}
            placeholder="Répondre dans le fil…"
            className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-muted focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (val) {
                  replyMutation.mutate(val);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Channel view ──────────────────────────────────────────────────────────────

function ChannelView({ channelId, myId }: { channelId: string; myId: string }) {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [threadMsgId, setThreadMsgId] = useState<string | null>(null);

  const { data: channel } = useQuery({
    queryKey: ["chat-channel", channelId],
    queryFn: () => apiGet<Channel>(`/v1/channels/${channelId}`),
  });

  const { data: messagesData, isLoading } = useQuery<{ data: ChatMsg[] }>({
    queryKey: ["chat-channel-messages", channelId],
    queryFn: () => apiGet<{ data: ChatMsg[] }>(`/v1/channels/${channelId}/messages?limit=60`),
    refetchInterval: 4_000,
  });

  const { data: bookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ["bookmarks"],
    queryFn: () => apiGet<Bookmark[]>("/v1/bookmarks"),
    refetchInterval: 30_000,
  });

  const bookmarkedIds = new Set(bookmarks.map((b) => b.messageId).filter(Boolean) as string[]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiPost(`/v1/channels/${channelId}/messages`, {
        content,
        replyToId: replyTo?.id ?? undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat-channel-messages", channelId] });
      void apiPost(`/v1/channels/${channelId}/read`, {});
      setReplyTo(null);
      // Clear draft on send
      void apiDelete(`/v1/channels/${channelId}/draft`);
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      apiPost(`/v1/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["chat-channel-messages", channelId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => apiDelete(`/v1/messages/${messageId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["chat-channel-messages", channelId] }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (messageId: string) => apiPost("/v1/bookmarks", { messageId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const unbookmarkMutation = useMutation({
    mutationFn: (messageId: string) => {
      const bm = bookmarks.find((b) => b.messageId === messageId);
      if (!bm) return Promise.resolve();
      return apiDelete(`/v1/bookmarks/${bm.id}`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  // Draft save (debounced)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDraft = useCallback(
    (content: string) => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        if (content.trim()) {
          void apiPut(`/v1/channels/${channelId}/draft`, { content });
        } else {
          void apiDelete(`/v1/channels/${channelId}/draft`);
        }
      }, 800);
    },
    [channelId],
  );

  // Scroll to bottom on new messages
  const messages = messagesData?.data ?? [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark read on mount
  useEffect(() => {
    void apiPost(`/v1/channels/${channelId}/read`, {});
  }, [channelId]);

  const isReadOnly = channel?.type === "ANNOUNCEMENT";

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-surface">
        <span className="text-lg font-semibold text-muted">#</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{channel?.name ?? "…"}</h2>
          {channel?.description && (
            <p className="text-xs text-muted truncate">{channel.description}</p>
          )}
        </div>
        <span className="text-xs text-muted">{channel?.memberCount ?? 0} membres</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 space-y-4 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-border animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-border rounded w-32 animate-pulse" />
                  <div className="h-3 bg-border rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted p-8">
            <span className="text-4xl mb-3"># </span>
            <p className="font-medium text-foreground">Début de {channel?.name ?? "ce canal"}</p>
            <p className="text-sm mt-1">Soyez le premier à écrire ici !</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender.id === myId}
              myId={myId}
              bookmarkedIds={bookmarkedIds}
              onReact={(emoji) => reactMutation.mutate({ messageId: msg.id, emoji })}
              onDelete={() => deleteMutation.mutate(msg.id)}
              onReply={() => setReplyTo(msg)}
              onOpenThread={() => setThreadMsgId(msg.id)}
              onBookmark={() => bookmarkMutation.mutate(msg.id)}
              onUnbookmark={() => unbookmarkMutation.mutate(msg.id)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {!isReadOnly && (
        <Composer
          placeholder={`Message #${channel?.name ?? "canal"}`}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onSend={async (content) => {
            saveDraft(""); // clear draft state tracker
            await sendMutation.mutateAsync(content);
          }}
        />
      )}
      {isReadOnly && (
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted bg-surface border border-border rounded-xl px-4 py-3">
            <span>📢</span>
            <span>Canal Annonces — seuls les administrateurs peuvent écrire ici.</span>
          </div>
        </div>
      )}

      {/* Thread panel */}
      {threadMsgId && (
        <ThreadPanel parentId={threadMsgId} myId={myId} onClose={() => setThreadMsgId(null)} />
      )}
    </div>
  );
}

// ─── DM view ───────────────────────────────────────────────────────────────────

function DmView({ conversationId, myId }: { conversationId: string; myId: string }) {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);

  interface ConvInfo {
    id: string;
    type: "DIRECT" | "GROUP";
    name: string | null;
    members: {
      userId: string;
      user: { id: string; displayName: string; avatarUrl: string | null };
    }[];
  }

  const { data: conv } = useQuery<ConvInfo>({
    queryKey: ["chat-conv", conversationId],
    queryFn: () => apiGet<ConvInfo>(`/v1/conversations/${conversationId}`),
  });

  const { data: messagesData, isLoading } = useQuery<{ data: ChatMsg[] }>({
    queryKey: ["chat-dm-messages", conversationId],
    queryFn: () =>
      apiGet<{ data: ChatMsg[] }>(`/v1/conversations/${conversationId}/messages?limit=60`),
    refetchInterval: 3_000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiPost(`/v1/conversations/${conversationId}/messages`, { content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat-dm-messages", conversationId] });
      void apiPost(`/v1/conversations/${conversationId}/read`, {});
      setReplyTo(null);
    },
  });

  const messages = messagesData?.data ?? [];

  const title =
    conv?.type === "DIRECT"
      ? (conv.members.find((m) => m.userId !== myId)?.user.displayName ?? "Direct")
      : (conv?.name ?? "Groupe");

  const otherAvatar =
    conv?.type === "DIRECT"
      ? (conv.members.find((m) => m.userId !== myId)?.user.avatarUrl ?? null)
      : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    void apiPost(`/v1/conversations/${conversationId}/read`, {});
  }, [conversationId]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-surface">
        <Avatar name={title} url={otherAvatar} size={32} />
        <h2 className="text-sm font-semibold flex-1 min-w-0 truncate">{title}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 space-y-4 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-border animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-border rounded w-24 animate-pulse" />
                  <div className="h-3 bg-border rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted p-8">
            <p className="font-medium text-foreground">Début de la conversation</p>
            <p className="text-sm mt-1">Envoyez un message à {title}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender.id === myId}
              myId={myId}
              bookmarkedIds={new Set()}
              onReact={() => undefined}
              onDelete={() => undefined}
              onReply={() => setReplyTo(msg)}
              onOpenThread={() => undefined}
              onBookmark={() => undefined}
              onUnbookmark={() => undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <Composer
        placeholder={`Message ${title}`}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={async (content) => {
          await sendMutation.mutateAsync(content);
        }}
      />
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center text-muted p-12">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-8 h-8 text-primary"
        >
          <path
            fillRule="evenodd"
            d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">Prinodia Chat</h3>
      <p className="text-sm max-w-xs">
        Sélectionnez un canal ou une conversation dans la barre latérale pour commencer.
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const myId = session?.user.id ?? "";

  const activeChannel = searchParams.get("channel");
  const activeDm = searchParams.get("dm");

  function selectChannel(id: string) {
    router.push(`/admin/chat?channel=${id}`);
  }

  function selectDm(id: string) {
    router.push(`/admin/chat?dm=${id}`);
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left sidebar */}
      <ChatSidebar
        myId={myId}
        activeChannel={activeChannel}
        activeDm={activeDm}
        onSelectChannel={selectChannel}
        onSelectDm={selectDm}
      />

      {/* Main content */}
      <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
        {activeChannel ? (
          <ChannelView key={`ch-${activeChannel}`} channelId={activeChannel} myId={myId} />
        ) : activeDm ? (
          <DmView key={`dm-${activeDm}`} conversationId={activeDm} myId={myId} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
