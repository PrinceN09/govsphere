"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { EventReminder } from "@/lib/calendar-types";

import { cn } from "@/components/ui/cn";
import { apiPost, apiDelete } from "@/lib/api";

interface Props {
  eventId: string;
  reminders: EventReminder[];
}

const PRESET_MINUTES = [
  { label: "15 min avant", value: 15 },
  { label: "30 min avant", value: 30 },
  { label: "1h avant", value: 60 },
  { label: "1 jour avant", value: 1440 },
];

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "Application",
  EMAIL: "Email",
  SMS: "SMS",
};

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min avant`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h avant`;
  return `${Math.round(minutes / 1440)} jour(s) avant`;
}

export function ReminderSettings({ eventId, reminders }: Props) {
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState(60);
  const [channel, setChannel] = useState<"IN_APP" | "EMAIL" | "SMS">("IN_APP");
  const [custom, setCustom] = useState(false);

  const addMutation = useMutation({
    mutationFn: () =>
      apiPost(`/v1/calendar/${eventId}/reminders`, { minutesBefore: minutes, channel }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["calendar-event", eventId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (reminderId: string) =>
      apiDelete(`/v1/calendar/${eventId}/reminders/${reminderId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["calendar-event", eventId] }),
  });

  return (
    <div className="space-y-3">
      {/* Existing reminders */}
      {reminders.length > 0 && (
        <div className="space-y-1.5">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg bg-navy-800 border border-navy-700 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm text-navy-200">
                <span className="text-navy-400">🔔</span>
                <span>{minutesLabel(r.minutesBefore)}</span>
                <span className="text-navy-500">via {CHANNEL_LABELS[r.channel]}</span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                disabled={deleteMutation.isPending}
                className="p-1 rounded text-navy-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add reminder */}
      <div className="rounded-lg border border-navy-700 bg-navy-800/50 p-3">
        <p className="text-xs font-medium text-navy-300 mb-2">Ajouter un rappel</p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_MINUTES.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setMinutes(p.value);
                setCustom(false);
              }}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                !custom && minutes === p.value
                  ? "bg-primary-600 text-white"
                  : "bg-navy-700 text-navy-300 hover:bg-navy-600",
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setCustom(true)}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              custom ? "bg-primary-600 text-white" : "bg-navy-700 text-navy-300 hover:bg-navy-600",
            )}
          >
            Personnalisé
          </button>
        </div>

        {custom && (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20 rounded border border-navy-600 bg-navy-700 px-2 py-1 text-xs text-white"
            />
            <span className="text-xs text-navy-400">minutes avant</span>
          </div>
        )}

        {/* Channel */}
        <div className="flex gap-1.5 mb-3">
          {(["IN_APP", "EMAIL", "SMS"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                channel === ch
                  ? "bg-navy-600 text-white"
                  : "bg-navy-700 text-navy-400 hover:bg-navy-600",
              )}
            >
              {CHANNEL_LABELS[ch]}
            </button>
          ))}
        </div>

        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || minutes < 1}
          className="rounded bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
        >
          {addMutation.isPending ? "Ajout..." : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
