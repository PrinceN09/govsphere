"use client";

/**
 * Prinodia Meet v1.5.0 — Meet Hub
 *
 * Unified meeting experience: lobby, live meeting controls, post-meeting view.
 * URL-driven state: ?meeting=<id>&view=<lobby|live|ended>
 *
 * Integration points:
 *  - Calendar: meetings sourced from CalendarModule
 *  - Chat: each meeting has an optional linked channel
 *  - People: participant profiles on click
 *  - Documents: file sharing during meetings
 *  - WebSocket: live state via /realtime namespace
 *
 * Phase 7 (Canvas): "Open Collaborative Canvas" placeholder is present,
 * designed so Canvas can be plugged in without changing this architecture.
 */

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { apiGet, apiPost } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetParticipant {
  id: string;
  userId: string;
  liveRole: "HOST" | "CO_HOST" | "PRESENTER" | "PARTICIPANT" | "GUEST";
  rsvpStatus: string;
  joinedAt: string | null;
  leftAt: string | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isInWaitingRoom: boolean;
  connectionQuality: string | null;
  user: { id: string; displayName: string; avatarUrl: string | null };
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meetingType: string;
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "POSTPONED";
  classification: string;
  organizerId: string;
  organizer: { id: string; displayName: string; avatarUrl: string | null };
  channelId: string | null;
  joinToken: string | null;
  isLocked: boolean;
  waitingRoomEnabled: boolean;
  maxParticipants: number | null;
  recordingEnabled: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareEnabled: boolean;
  liveStartedAt: string | null;
  liveEndedAt: string | null;
  event: { startAt: string; endAt: string };
  participants: MeetParticipant[];
  _count: { participants: number; recordings: number; polls: number };
}

interface Poll {
  id: string;
  question: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  isAnonymous: boolean;
  options: { id: string; text: string; order: number }[];
  _count: { votes: number };
}

interface Recording {
  id: string;
  status: "PENDING" | "RECORDING" | "PROCESSING" | "READY" | "FAILED";
  filename: string | null;
  durationSeconds: number | null;
  downloadUrl: string | null;
  startedAt: string;
  stoppedAt: string | null;
}

type ViewMode = "hub" | "lobby" | "live" | "ended";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function statusColor(status: Meeting["status"]) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-green-500";
    case "SCHEDULED":
      return "bg-blue-500";
    case "COMPLETED":
      return "bg-gray-400";
    case "CANCELLED":
      return "bg-red-500";
    default:
      return "bg-yellow-500";
  }
}

function statusLabel(status: Meeting["status"]) {
  const map: Record<Meeting["status"], string> = {
    DRAFT: "Brouillon",
    SCHEDULED: "Planifiée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
    POSTPONED: "Reportée",
  };
  return map[status] ?? status;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

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
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

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
  return (
    <div
      className={`rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onClick,
}: {
  meeting: Meeting;
  onClick: () => void;
}) {
  const isLive = meeting.status === "IN_PROGRESS";

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor(meeting.status)} ${isLive ? "animate-pulse" : ""}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm group-hover:text-indigo-700">
              {meeting.title}
            </h3>
            {isLive && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded shrink-0">
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">{fmtDate(meeting.event.startAt)}</p>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1">
              {meeting.participants.slice(0, 4).map((p) => (
                <Avatar
                  key={p.id}
                  name={p.user.displayName}
                  url={p.user.avatarUrl}
                  size={20}
                  className="ring-2 ring-white"
                />
              ))}
              {meeting._count.participants > 4 && (
                <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                  +{meeting._count.participants - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {meeting._count.participants} participant{meeting._count.participants !== 1 ? "s" : ""}
            </span>
            {meeting._count.recordings > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                {meeting._count.recordings}
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400 shrink-0">{statusLabel(meeting.status)}</div>
      </div>
    </button>
  );
}

// ─── Participant Tile ─────────────────────────────────────────────────────────

function ParticipantTile({
  participant,
  isMe,
}: {
  participant: MeetParticipant;
  isMe: boolean;
}) {
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {participant.isVideoOff ? (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={participant.user.displayName} url={participant.user.avatarUrl} size={48} />
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-gray-900 flex items-center justify-center">
          <Avatar name={participant.user.displayName} url={participant.user.avatarUrl} size={56} />
        </div>
      )}

      {/* Name bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-medium truncate">
            {participant.user.displayName}
            {isMe && " (vous)"}
          </span>
          {participant.isAudioMuted && (
            <svg className="w-3 h-3 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {participant.isHandRaised && (
            <span className="text-yellow-400 text-xs">✋</span>
          )}
          {participant.liveRole === "HOST" && (
            <span className="bg-indigo-600 text-white text-[9px] font-bold px-1 rounded">HOST</span>
          )}
        </div>
      </div>

      {/* Waiting room badge */}
      {participant.isInWaitingRoom && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          En attente
        </div>
      )}
    </div>
  );
}

// ─── Meeting Lobby ────────────────────────────────────────────────────────────

function MeetingLobby({
  meeting,
  myId,
  onJoin,
  onBack,
}: {
  meeting: Meeting;
  myId: string;
  onJoin: () => void;
  onBack: () => void;
}) {
  const isOrganizer = meeting.organizerId === myId;
  const myParticipant = meeting.participants.find((p) => p.userId === myId);
  const canJoin = meeting.status === "IN_PROGRESS" || isOrganizer;

  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin() {
    setIsJoining(true);
    try {
      await apiPost(`/v1/meet/${meeting.id}/join`);
      onJoin();
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
          <button
            onClick={onBack}
            className="text-indigo-200 hover:text-white text-sm mb-4 flex items-center gap-1"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${statusColor(meeting.status)} ${meeting.status === "IN_PROGRESS" ? "animate-pulse" : ""}`}
            />
            <span className="text-indigo-200 text-sm">{statusLabel(meeting.status)}</span>
          </div>
          <h1 className="text-xl font-bold mb-1">{meeting.title}</h1>
          <p className="text-indigo-200 text-sm">
            {fmtDate(meeting.event.startAt)} — {fmtDate(meeting.event.endAt)}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Organizer */}
          <div className="flex items-center gap-3">
            <Avatar
              name={meeting.organizer.displayName}
              url={meeting.organizer.avatarUrl}
              size={36}
            />
            <div>
              <p className="text-xs text-gray-500">Organisé par</p>
              <p className="text-sm font-medium text-gray-900">{meeting.organizer.displayName}</p>
            </div>
          </div>

          {meeting.description && (
            <p className="text-sm text-gray-600">{meeting.description}</p>
          )}

          {/* Settings row */}
          <div className="flex flex-wrap gap-2">
            {meeting.waitingRoomEnabled && (
              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full border border-yellow-200">
                Salle d'attente activée
              </span>
            )}
            {meeting.recordingEnabled && (
              <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                Enregistrement activé
              </span>
            )}
            {meeting.isLocked && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                🔒 Réunion verrouillée
              </span>
            )}
            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">
              {meeting._count.participants} participant{meeting._count.participants !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Participants */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Participants
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {meeting.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar name={p.user.displayName} url={p.user.avatarUrl} size={28} />
                  <span className="text-sm text-gray-700 flex-1">{p.user.displayName}</span>
                  {p.liveRole === "HOST" && (
                    <span className="text-xs text-indigo-600 font-semibold">Hôte</span>
                  )}
                  {p.joinedAt && !p.leftAt && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Présent" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          {isOrganizer && meeting.status === "SCHEDULED" && (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60"
            >
              {isJoining ? "Démarrage…" : "🚀 Démarrer la réunion"}
            </button>
          )}
          {canJoin && meeting.status === "IN_PROGRESS" && (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60"
            >
              {isJoining ? "Connexion…" : "📹 Rejoindre la réunion"}
            </button>
          )}
          {meeting.status === "COMPLETED" && (
            <div className="text-center py-3 text-sm text-gray-500">
              Cette réunion est terminée.
            </div>
          )}
          {meeting.status === "CANCELLED" && (
            <div className="text-center py-3 text-sm text-red-500">
              Cette réunion a été annulée.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Live Meeting View ────────────────────────────────────────────────────────

function LiveMeetingView({
  meeting,
  myId,
  onEnd,
}: {
  meeting: Meeting;
  myId: string;
  onEnd: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showPolls, setShowPolls] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const isHost = meeting.participants.find(
    (p) => p.userId === myId && (p.liveRole === "HOST" || p.liveRole === "CO_HOST"),
  );
  const isOrganizer = meeting.organizerId === myId;
  const canHostControl = !!(isHost ?? isOrganizer);

  const activeParticipants = meeting.participants.filter((p) => p.joinedAt && !p.leftAt);

  useEffect(() => {
    void apiGet<Poll[]>(`/v1/meet/${meeting.id}/polls`).then(setPolls).catch(() => null);
    void apiGet<Recording[]>(`/v1/meet/${meeting.id}/recordings`).then((recs) => {
      setRecordings(recs);
      setIsRecording(recs.some((r) => r.status === "RECORDING"));
    }).catch(() => null);
  }, [meeting.id]);

  async function toggleMute() {
    setIsMuted((m) => !m);
    // In a real implementation: update media track + signal to peers
  }

  async function toggleVideo() {
    setIsVideoOff((v) => !v);
  }

  async function toggleScreenShare() {
    setIsScreenSharing((s) => !s);
  }

  async function toggleHand() {
    if (handRaised) {
      await apiPost(`/v1/meet/${meeting.id}/lower-hand`);
    } else {
      await apiPost(`/v1/meet/${meeting.id}/raise-hand`);
    }
    setHandRaised((h) => !h);
  }

  async function toggleRecording() {
    if (isRecording) {
      const rec = recordings.find((r) => r.status === "RECORDING");
      if (rec) {
        await apiPost(`/v1/meet/${meeting.id}/recordings/${rec.id}/stop`);
        setIsRecording(false);
      }
    } else {
      const rec = await apiPost<Recording>(`/v1/meet/${meeting.id}/recordings/start`);
      setRecordings((prev) => [rec, ...prev]);
      setIsRecording(true);
    }
  }

  async function handleEnd() {
    if (!canHostControl) {
      // Regular participant just leaves
      await apiPost(`/v1/meet/${meeting.id}/leave`);
      onEnd();
      return;
    }
    setIsEnding(true);
    try {
      await apiPost(`/v1/meet/${meeting.id}/end`);
      onEnd();
    } finally {
      setIsEnding(false);
    }
  }

  const gridCols =
    activeParticipants.length <= 1
      ? "grid-cols-1"
      : activeParticipants.length <= 4
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white text-sm font-medium truncate max-w-xs">
              {meeting.title}
            </span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              REC
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParticipants((s) => !s)}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${showParticipants ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
          >
            👥 {activeParticipants.length}
          </button>
          <button
            onClick={() => setShowChat((s) => !s)}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${showChat ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setShowPolls((s) => !s)}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${showPolls ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
          >
            📊 Sondages{polls.length > 0 ? ` (${polls.length})` : ""}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-3 overflow-auto">
          {activeParticipants.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-3">📹</div>
                <p className="text-sm">En attente de participants…</p>
              </div>
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-2 h-full`}>
              {activeParticipants.map((p) => (
                <ParticipantTile key={p.id} participant={p} isMe={p.userId === myId} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        {(showParticipants || showChat || showPolls) && (
          <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
            {showParticipants && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Participants ({activeParticipants.length})
                </p>
                <div className="space-y-2">
                  {meeting.participants.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 p-1.5 rounded-lg ${p.isInWaitingRoom ? "bg-yellow-900/30 border border-yellow-700/40" : ""}`}
                    >
                      <Avatar
                        name={p.user.displayName}
                        url={p.user.avatarUrl}
                        size={28}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {p.user.displayName}
                          {p.userId === myId && (
                            <span className="text-gray-400 ml-1">(vous)</span>
                          )}
                        </p>
                        <p className="text-gray-500 text-[10px]">
                          {p.isInWaitingRoom
                            ? "Salle d'attente"
                            : p.liveRole === "HOST"
                              ? "Hôte"
                              : p.liveRole === "CO_HOST"
                                ? "Co-hôte"
                                : "Participant"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {p.isAudioMuted && (
                          <span className="text-red-400 text-xs" title="Muet">🔇</span>
                        )}
                        {p.isVideoOff && (
                          <span className="text-red-400 text-xs" title="Caméra off">📵</span>
                        )}
                        {p.isHandRaised && (
                          <span className="text-yellow-400 text-xs">✋</span>
                        )}
                      </div>
                      {/* Host: admit from waiting */}
                      {canHostControl && p.isInWaitingRoom && (
                        <button
                          onClick={async () => {
                            await apiPost(`/v1/meet/${meeting.id}/admit/${p.userId}`);
                          }}
                          className="text-green-400 text-xs hover:text-green-300 ml-1"
                        >
                          Admettre
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showPolls && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Sondages
                </p>
                {polls.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-4">Aucun sondage</p>
                ) : (
                  <div className="space-y-3">
                    {polls.map((poll) => (
                      <div key={poll.id} className="bg-gray-800 rounded-lg p-3">
                        <p className="text-white text-xs font-medium mb-2">{poll.question}</p>
                        <div className="space-y-1.5">
                          {poll.options.map((opt) => (
                            <button
                              key={opt.id}
                              disabled={poll.status !== "ACTIVE"}
                              onClick={async () => {
                                await apiPost(`/v1/meet/${meeting.id}/polls/${poll.id}/vote`, {
                                  optionId: opt.id,
                                });
                              }}
                              className="w-full text-left text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded px-2 py-1.5 transition"
                            >
                              {opt.text}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-semibold ${poll.status === "ACTIVE" ? "text-green-400" : poll.status === "CLOSED" ? "text-gray-400" : "text-yellow-400"}`}
                          >
                            {poll.status === "ACTIVE"
                              ? "En cours"
                              : poll.status === "CLOSED"
                                ? "Terminé"
                                : "Brouillon"}
                          </span>
                          <span className="text-gray-500 text-[10px]">
                            {poll._count.votes} vote{poll._count.votes !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Canvas placeholder — Phase 7 hook point */}
            <div className="p-3 border-t border-gray-800">
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-500 rounded-lg text-xs cursor-not-allowed"
                title="Disponible dans une prochaine version"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2H5v-2h10zm-8-2v-2H5v2h2zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Ouvrir le Canvas collaboratif
                <span className="ml-auto text-[10px] bg-indigo-900 text-indigo-400 px-1.5 rounded">
                  Bientôt
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center justify-center gap-3">
        {/* Mic */}
        <button
          onClick={() => void toggleMute()}
          className={`p-3 rounded-full transition ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}
          title={isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {isMuted ? (
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 3a1 1 0 012 0v.586l3.707 3.707A3 3 0 0016 10H4a3 3 0 001.293-2.707L9 3.586V3zM3.293 3.293a1 1 0 011.414 0L10 8.586l5.293-5.293a1 1 0 111.414 1.414L11.414 10l5.293 5.293a1 1 0 01-1.414 1.414L10 11.414l-5.293 5.293a1 1 0 01-1.414-1.414L8.586 10 3.293 4.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Camera */}
        <button
          onClick={() => void toggleVideo()}
          className={`p-3 rounded-full transition ${isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"}`}
          title={isVideoOff ? "Activer la caméra" : "Couper la caméra"}
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </button>

        {/* Screen share */}
        <button
          onClick={() => void toggleScreenShare()}
          className={`p-3 rounded-full transition ${isScreenSharing ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-700 hover:bg-gray-600"}`}
          title={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.321A1 1 0 0113 17H7a1 1 0 01-.707-1.707l.804-.321.123-.489H5a2 2 0 01-2-2V5zm5.771 7H11L9.22 8.22 7.5 12H9l.771-2H9.77L9 12h.771z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Hand raise */}
        <button
          onClick={() => void toggleHand()}
          className={`p-3 rounded-full transition ${handRaised ? "bg-yellow-500 hover:bg-yellow-600" : "bg-gray-700 hover:bg-gray-600"}`}
          title={handRaised ? "Baisser la main" : "Lever la main"}
        >
          <span className="text-lg leading-none">✋</span>
        </button>

        {/* Recording (host only) */}
        {canHostControl && (
          <button
            onClick={() => void toggleRecording()}
            className={`p-3 rounded-full transition ${isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gray-700 hover:bg-gray-600"}`}
            title={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="10" r="5" />
            </svg>
          </button>
        )}

        {/* Mute all (host only) */}
        {canHostControl && (
          <button
            onClick={async () => {
              await apiPost(`/v1/meet/${meeting.id}/mute-all`);
            }}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition"
            title="Couper tous les micros"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z" />
            </svg>
          </button>
        )}

        {/* End / Leave */}
        <button
          onClick={() => void handleEnd()}
          disabled={isEnding}
          className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-60 ml-2"
        >
          {isEnding ? "…" : canHostControl ? "Terminer" : "Quitter"}
        </button>
      </div>
    </div>
  );
}

// ─── Post-Meeting View ────────────────────────────────────────────────────────

function PostMeetingView({
  meeting,
  onBack,
}: {
  meeting: Meeting;
  onBack: () => void;
}) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void apiGet<Recording[]>(`/v1/meet/${meeting.id}/recordings`)
      .then(setRecordings)
      .catch(() => null);
  }, [meeting.id]);

  const duration =
    meeting.liveStartedAt && meeting.liveEndedAt
      ? Math.floor(
          (new Date(meeting.liveEndedAt).getTime() -
            new Date(meeting.liveStartedAt).getTime()) /
            1000,
        )
      : null;

  async function saveSummary() {
    if (!summaryText.trim()) return;
    setIsSaving(true);
    try {
      await apiPost(`/v1/meet/${meeting.id}/summaries`, { overview: summaryText });
      setSaved(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Retour
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{meeting.title}</h1>
            <p className="text-sm text-gray-500">Réunion terminée</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {meeting._count.participants}
            </p>
            <p className="text-xs text-gray-500 mt-1">Participants</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {duration != null ? fmtDuration(duration) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Durée</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{recordings.length}</p>
            <p className="text-xs text-gray-500 mt-1">Enregistrements</p>
          </div>
        </div>

        {/* Recordings */}
        {recordings.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Enregistrements</h2>
            <div className="space-y-2">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${rec.status === "READY" ? "bg-green-500" : rec.status === "RECORDING" ? "bg-red-500 animate-pulse" : rec.status === "PROCESSING" ? "bg-yellow-500" : "bg-gray-400"}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {rec.filename ?? "Enregistrement"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {rec.durationSeconds ? fmtDuration(rec.durationSeconds) : "—"} •{" "}
                      {rec.status}
                    </p>
                  </div>
                  {rec.downloadUrl && rec.status === "READY" && (
                    <a
                      href={rec.downloadUrl}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Télécharger
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Compte-rendu</h2>
          <p className="text-xs text-gray-500 mb-2">
            Résumé de la réunion — les transcripts et le résumé IA seront disponibles
            dans une prochaine version.
          </p>
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={5}
            placeholder="Rédigez un compte-rendu de la réunion…"
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            {saved ? (
              <span className="text-green-600 text-xs font-semibold">✓ Sauvegardé</span>
            ) : (
              <button
                onClick={() => void saveSummary()}
                disabled={isSaving || !summaryText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {isSaving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>

        {/* AI placeholder */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4 text-center">
          <p className="text-sm font-semibold text-indigo-700 mb-1">
            🤖 Résumé IA — Bientôt disponible
          </p>
          <p className="text-xs text-indigo-500">
            Le résumé automatique, les décisions et les tâches seront extraits
            à partir de la transcription par IA dans une prochaine version.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Meet Hub ─────────────────────────────────────────────────────────────────

function MeetHub({
  myId,
  onSelectMeeting,
}: {
  myId: string;
  onSelectMeeting: (id: string) => void;
}) {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [active, setActive] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [up, act] = await Promise.all([
        apiGet<Meeting[]>("/v1/meet").catch(() => []),
        apiGet<Meeting[]>("/v1/meet/active").catch(() => []),
      ]);
      setActive(act);
      // Exclude already-active from upcoming list
      const activeIds = new Set(act.map((m) => m.id));
      setUpcoming(up.filter((m) => !activeIds.has(m.id)));
      setLoading(false);
    }
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Chargement des réunions…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prinodia Meet</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Réunions vidéo intégrées à votre espace de travail
            </p>
          </div>
          <a
            href="/admin/meetings/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            + Planifier
          </a>
        </div>

        {/* Active meetings */}
        {active.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                En cours ({active.length})
              </h2>
            </div>
            <div className="space-y-2">
              {active.map((m) => (
                <MeetingCard key={m.id} meeting={m} onClick={() => onSelectMeeting(m.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Prochaines réunions
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm font-medium text-gray-700">Aucune réunion planifiée</p>
              <p className="text-xs text-gray-400 mt-1">
                Planifiez une réunion depuis le Calendrier ou ici.
              </p>
              <a
                href="/admin/meetings/new"
                className="mt-4 inline-block text-indigo-600 text-sm font-semibold hover:underline"
              >
                Planifier une réunion →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} onClick={() => onSelectMeeting(m.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Page Inner ───────────────────────────────────────────────────────────────

function MeetPageInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const myId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const meetingId = searchParams.get("meeting");
  const viewParam = searchParams.get("view") as ViewMode | null;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [view, setView] = useState<ViewMode>(viewParam ?? "hub");

  useEffect(() => {
    if (!meetingId) {
      setView("hub");
      setMeeting(null);
      return;
    }
    void apiGet<Meeting>(`/v1/meet/${meetingId}`)
      .then((m) => {
        setMeeting(m);
        setView(viewParam ?? "lobby");
      })
      .catch(() => {
        router.replace("/admin/meet");
      });
  }, [meetingId, viewParam, router]);

  function selectMeeting(id: string) {
    router.push(`/admin/meet?meeting=${id}&view=lobby`);
  }

  function goToLive() {
    if (!meetingId) return;
    // Start the meeting then go live
    void apiPost(`/v1/meet/${meetingId}/start`).then(() => {
      router.push(`/admin/meet?meeting=${meetingId}&view=live`);
    });
  }

  function goToEnd() {
    if (!meetingId) return;
    router.push(`/admin/meet?meeting=${meetingId}&view=ended`);
  }

  function goBack() {
    router.push("/admin/meet");
  }

  if (view === "hub" || !meeting) {
    return (
      <div className="flex h-full">
        <MeetHub myId={myId} onSelectMeeting={selectMeeting} />
      </div>
    );
  }

  if (view === "lobby") {
    return (
      <MeetingLobby
        meeting={meeting}
        myId={myId}
        onJoin={goToLive}
        onBack={goBack}
      />
    );
  }

  if (view === "live") {
    // Reload meeting to get fresh participant data
    return (
      <LiveMeetingView
        meeting={meeting}
        myId={myId}
        onEnd={goToEnd}
      />
    );
  }

  if (view === "ended") {
    return <PostMeetingView meeting={meeting} onBack={goBack} />;
  }

  return null;
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function MeetPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <MeetPageInner />
      </Suspense>
    </div>
  );
}
