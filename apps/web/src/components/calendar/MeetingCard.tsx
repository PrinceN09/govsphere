"use client";

import Link from "next/link";

import { cn } from "@/components/ui/cn";
import {
  CLASSIFICATION_COLOR,
  CLASSIFICATION_LABELS,
  fmtDate,
  fmtDuration,
  fmtTime,
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
  RSVP_STATUS_COLOR,
  RSVP_STATUS_LABELS,
  type Meeting,
  type RsvpStatus,
} from "@/lib/calendar-types";

interface Props {
  meeting: Meeting;
  myRsvp?: RsvpStatus;
  compact?: boolean;
}

export function MeetingCard({ meeting, myRsvp, compact = false }: Props) {
  const start = meeting.event.startAt;
  const end = meeting.event.endAt;

  if (compact) {
    return (
      <Link
        href={`/admin/meetings/${meeting.id}`}
        className="block rounded-lg border border-navy-700 bg-navy-800 p-3 hover:border-navy-600 hover:bg-navy-750 transition-all group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
              {meeting.title}
            </p>
            <p className="mt-0.5 text-xs text-navy-400">
              {fmtDate(start)} · {fmtTime(start)} – {fmtTime(end)}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
              MEETING_STATUS_COLOR[meeting.status],
            )}
          >
            {MEETING_STATUS_LABELS[meeting.status]}
          </span>
        </div>
        {myRsvp && (
          <div className="mt-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                RSVP_STATUS_COLOR[myRsvp],
              )}
            >
              {RSVP_STATUS_LABELS[myRsvp]}
            </span>
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/admin/meetings/${meeting.id}`}
      className="block rounded-xl border border-navy-700 bg-navy-800 p-4 hover:border-navy-600 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title + badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                MEETING_STATUS_COLOR[meeting.status],
              )}
            >
              {MEETING_STATUS_LABELS[meeting.status]}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                CLASSIFICATION_COLOR[meeting.classification],
              )}
            >
              {CLASSIFICATION_LABELS[meeting.classification]}
            </span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-navy-700 text-navy-300">
              {MEETING_TYPE_LABELS[meeting.meetingType]}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors truncate">
            {meeting.title}
          </h3>

          {/* Date / time / duration */}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-navy-400">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm0 5.5a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"
                  clipRule="evenodd"
                />
              </svg>
              {fmtDate(start)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                  clipRule="evenodd"
                />
              </svg>
              {fmtTime(start)} – {fmtTime(end)} ({fmtDuration(start, end)})
            </span>
            {meeting.location && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                    clipRule="evenodd"
                  />
                </svg>
                {meeting.location}
              </span>
            )}
          </div>

          {/* Organizer */}
          <p className="mt-1 text-xs text-navy-500">
            Organisateur:{" "}
            <span className="text-navy-300">
              {meeting.organizer.displayName ?? meeting.organizer.email}
            </span>
          </p>
        </div>

        {/* Right: participant count + RSVP */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {myRsvp && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                RSVP_STATUS_COLOR[myRsvp],
              )}
            >
              {RSVP_STATUS_LABELS[myRsvp]}
            </span>
          )}
          {meeting._count && (
            <span className="text-[10px] text-navy-500">
              {meeting._count.participants} participant(s)
            </span>
          )}
          {meeting.room && (
            <span className="text-[10px] text-navy-400">🏢 {meeting.room.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
