"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

import { PresenceBadge } from "./PresenceBadge";
import { TypingIndicator } from "./TypingIndicator";

export interface ChatMessage {
  id: string;
  content: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { id: string; displayName: string };
  } | null;
  reactions?: { emoji: string; userId: string }[];
  _count?: { replies: number };
}

interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  typingNames?: string[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "✅"];

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
        unoptimized
      />
    );
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  onReact,
  onDelete,
}: {
  message: ChatMessage;
  isOwn: boolean;
  onReact?: (emoji: string) => void;
  onDelete?: () => void;
}) {
  if (message.deletedAt) {
    return <span className="text-xs italic text-slate-400">[Message supprimé]</span>;
  }

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="group relative">
      {/* Reply preview */}
      {message.replyTo && (
        <div className="mb-1 flex items-start gap-1 rounded border-l-2 border-slate-300 bg-slate-50 px-2 py-1">
          <span className="text-[10px] font-medium text-slate-500">
            ↩ {message.replyTo.sender.displayName}:
          </span>
          <span className="line-clamp-1 text-[10px] text-slate-500">{message.replyTo.content}</span>
        </div>
      )}

      {/* Message text */}
      <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{message.content}</p>

      {/* Reactions */}
      {reactionGroups && Object.keys(reactionGroups).length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(reactionGroups).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact?.(emoji)}
              className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs hover:bg-slate-200 transition-colors"
            >
              <span>{emoji}</span>
              <span className="text-slate-600">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute right-0 top-0 hidden group-hover:flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white shadow-sm p-0.5">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact?.(emoji)}
            className="rounded p-1 text-sm hover:bg-slate-100 transition-colors"
            aria-label={`Réagir avec ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        {isOwn && onDelete && (
          <button
            onClick={onDelete}
            className="ml-1 rounded p-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Supprimer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-0.5 flex items-center gap-1">
        <span className="text-[10px] text-slate-400">
          {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {message.editedAt && <span className="text-[10px] text-slate-400 italic">· modifié</span>}
        {(message._count?.replies ?? 0) > 0 && (
          <span className="text-[10px] text-primary-600">
            · {message._count?.replies} réponse{(message._count?.replies ?? 0) > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function ChatWindow({
  messages,
  currentUserId,
  typingNames = [],
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onReact,
  onDelete,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Load more */}
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={onLoadMore}
              className="text-xs text-primary-600 hover:text-primary-700 underline"
            >
              Charger les messages précédents
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-16 text-center">
            <div>
              <ChatIcon />
              <p className="mt-2 text-sm text-slate-500">Aucun message pour l&apos;instant.</p>
              <p className="text-xs text-slate-400">Soyez le premier à écrire!</p>
            </div>
          </div>
        )}

        {/* Message list — group consecutive messages by same sender */}
        <div className="space-y-1">
          {messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const isSameSender = prev?.sender.id === msg.sender.id;
            const isOwn = msg.sender.id === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar — only show when sender changes */}
                {!isSameSender ? (
                  <Avatar name={msg.sender.displayName} url={msg.sender.avatarUrl} />
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}

                <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                  {/* Sender name — only show when sender changes */}
                  {!isSameSender && (
                    <span
                      className={`mb-0.5 text-xs font-medium text-slate-600 ${isOwn ? "text-right" : ""}`}
                    >
                      {isOwn ? "Vous" : msg.sender.displayName}
                    </span>
                  )}

                  <div
                    className={[
                      "rounded-xl px-3 py-2",
                      isOwn
                        ? "rounded-tr-sm bg-primary-600 text-white"
                        : "rounded-tl-sm bg-white border border-slate-200",
                    ].join(" ")}
                  >
                    <MessageBubble
                      message={msg}
                      isOwn={isOwn}
                      {...(onReact ? { onReact: (emoji: string) => onReact(msg.id, emoji) } : {})}
                      {...(onDelete && isOwn ? { onDelete: () => onDelete(msg.id) } : {})}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      <TypingIndicator names={typingNames} />
    </div>
  );
}

function ChatIcon() {
  return (
    <svg className="mx-auto h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Re-export PresenceBadge for convenience
export { PresenceBadge };
