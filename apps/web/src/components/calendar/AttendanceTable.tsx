"use client";

import { useState } from "react";

import { cn } from "@/components/ui/cn";
import {
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABELS,
  PARTICIPANT_ROLE_LABELS,
  RSVP_STATUS_LABELS,
  type AttendanceStatus,
  type MeetingParticipant,
} from "@/lib/calendar-types";

interface Props {
  participants: MeetingParticipant[];
  isOrganizer?: boolean;
  onRecord?: (participantId: string, status: AttendanceStatus) => Promise<void>;
}

const ATTENDANCE_OPTIONS: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
  "DELEGATED",
];

export function AttendanceTable({ participants, isOrganizer, onRecord }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRecord(participantId: string, status: AttendanceStatus) {
    if (!onRecord) return;
    setLoading(participantId);
    try {
      await onRecord(participantId, status);
    } finally {
      setLoading(null);
    }
  }

  const stats = {
    present: participants.filter(
      (p) => p.attendanceStatus === "PRESENT" || p.attendanceStatus === "LATE",
    ).length,
    absent: participants.filter((p) => p.attendanceStatus === "ABSENT").length,
    excused: participants.filter((p) => p.attendanceStatus === "EXCUSED").length,
    pending: participants.filter((p) => !p.attendanceStatus).length,
  };

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Présents", value: stats.present, color: "text-emerald-400" },
          { label: "Absents", value: stats.absent, color: "text-red-400" },
          { label: "Excusés", value: stats.excused, color: "text-blue-400" },
          { label: "Non enregistrés", value: stats.pending, color: "text-navy-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg bg-navy-800 border border-navy-700 p-3 text-center"
          >
            <div className={cn("text-2xl font-bold", color)}>{value}</div>
            <div className="text-xs text-navy-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-navy-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700 bg-navy-900/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-navy-400 uppercase tracking-wide">
                Participant
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-navy-400 uppercase tracking-wide">
                Rôle
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-navy-400 uppercase tracking-wide">
                RSVP
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-navy-400 uppercase tracking-wide">
                Présence
              </th>
              {isOrganizer && (
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-navy-400 uppercase tracking-wide">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {participants.map((p) => (
              <tr key={p.id} className="hover:bg-navy-800/40 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{p.user.displayName ?? p.user.email}</p>
                    <p className="text-xs text-navy-500">{p.user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-navy-400">
                  {PARTICIPANT_ROLE_LABELS[p.role]}
                </td>
                <td className="px-4 py-3 text-xs text-navy-400">
                  {RSVP_STATUS_LABELS[p.rsvpStatus]}
                </td>
                <td className="px-4 py-3">
                  {p.attendanceStatus ? (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        ATTENDANCE_STATUS_COLOR[p.attendanceStatus],
                      )}
                    >
                      {ATTENDANCE_STATUS_LABELS[p.attendanceStatus]}
                    </span>
                  ) : (
                    <span className="text-xs text-navy-600 italic">Non enregistré</span>
                  )}
                </td>
                {isOrganizer && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ATTENDANCE_OPTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => void handleRecord(p.id, status)}
                          disabled={loading === p.id || p.attendanceStatus === status}
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                            p.attendanceStatus === status
                              ? cn(ATTENDANCE_STATUS_COLOR[status], "cursor-default")
                              : "bg-navy-700 text-navy-300 hover:bg-navy-600 disabled:opacity-50",
                          )}
                        >
                          {ATTENDANCE_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
