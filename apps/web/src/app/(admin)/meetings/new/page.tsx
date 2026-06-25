"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RoomBookingWidget } from "@/components/calendar/RoomBookingWidget";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import { MEETING_TYPE_LABELS, type MeetingType } from "@/lib/calendar-types";

const MEETING_TYPES: MeetingType[] = [
  "REGULAR",
  "EMERGENCY",
  "CABINET",
  "MINISTERIAL",
  "COMMITTEE",
  "WORKING_GROUP",
  "BILATERAL",
  "TRILATERAL",
  "VIRTUAL",
  "HYBRID",
];

const CLASSIFICATIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "INTERNAL", label: "Interne" },
  { value: "CONFIDENTIAL", label: "Confidentiel" },
  { value: "SECRET", label: "Secret" },
];

export default function NewMeetingPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    timezone: "Africa/Kinshasa",
    location: "",
    onlineMeetingUrl: "",
    meetingType: "REGULAR" as MeetingType,
    classification: "INTERNAL",
    roomId: "",
    participantEmails: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation<{ id: string }, Error>({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: form.title,
        startAt: form.startAt,
        endAt: form.endAt,
        timezone: form.timezone,
        meetingType: form.meetingType,
        classification: form.classification,
      };
      if (form.description.trim()) payload["description"] = form.description;
      if (form.location.trim()) payload["location"] = form.location;
      if (form.onlineMeetingUrl.trim()) payload["onlineMeetingUrl"] = form.onlineMeetingUrl;
      if (form.roomId) payload["roomId"] = form.roomId;
      return apiPost<{ id: string }>("/v1/meetings", payload);
    },
    onSuccess: (data) => {
      router.push(`/admin/meetings/${data.id}`);
    },
    onError: (err) => setError(err.message),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isValid = form.title.trim() && form.startAt && form.endAt;

  return (
    <>
      <AdminTopBar title="Planifier une réunion" subtitle="Nouvelle réunion gouvernementale" />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Main form */}
          <div className="col-span-2 space-y-5">
            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-sm font-semibold text-white">Informations générales</h2>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-navy-300 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Réunion du Conseil des ministres..."
                    className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-navy-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={3}
                    placeholder="Ordre du jour, contexte..."
                    className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Date/time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-navy-300 mb-1">Début *</label>
                    <input
                      type="datetime-local"
                      value={form.startAt}
                      onChange={(e) => set("startAt", e.target.value)}
                      className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy-300 mb-1">Fin *</label>
                    <input
                      type="datetime-local"
                      value={form.endAt}
                      onChange={(e) => set("endAt", e.target.value)}
                      className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-navy-300 mb-1">Lieu</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Palais de la Nation, Kinshasa"
                    className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-medium text-navy-300 mb-1">
                    Lien visioconférence
                  </label>
                  <input
                    type="url"
                    value={form.onlineMeetingUrl}
                    onChange={(e) => set("onlineMeetingUrl", e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white placeholder-navy-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-sm font-semibold text-white">Classification</h2>

                <div className="grid grid-cols-2 gap-3">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-medium text-navy-300 mb-1">
                      Type de réunion
                    </label>
                    <select
                      value={form.meetingType}
                      onChange={(e) => set("meetingType", e.target.value as MeetingType)}
                      className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                    >
                      {MEETING_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {MEETING_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="block text-xs font-medium text-navy-300 mb-1">
                      Classification
                    </label>
                    <select
                      value={form.classification}
                      onChange={(e) => set("classification", e.target.value)}
                      className="w-full rounded border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                    >
                      {CLASSIFICATIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Room booking */}
            <Card>
              <CardBody>
                <h2 className="text-sm font-semibold text-white mb-3">Réserver une salle</h2>
                <RoomBookingWidget
                  selectedRoomId={form.roomId}
                  onSelect={(id) => set("roomId", id === form.roomId ? "" : id)}
                  {...(form.startAt ? { startAt: new Date(form.startAt).toISOString() } : {})}
                  {...(form.endAt ? { endAt: new Date(form.endAt).toISOString() } : {})}
                />
              </CardBody>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              {error && (
                <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}
              <button
                onClick={() => mutation.mutate()}
                disabled={!isValid || mutation.isPending}
                className="w-full rounded bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
              >
                {mutation.isPending ? "Création..." : "Planifier la réunion"}
              </button>
              <button
                onClick={() => router.back()}
                className="w-full rounded border border-navy-700 px-4 py-2.5 text-sm font-medium text-navy-300 hover:border-navy-600 hover:text-white transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
