"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AttendanceTable } from "@/components/calendar/AttendanceTable";
import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPatch } from "@/lib/api";
import { fmtDate, fmtTime, type AttendanceStatus, type Meeting } from "@/lib/calendar-types";

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const qc = useQueryClient();

  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: ["meeting", id],
    queryFn: () => apiGet(`/v1/meetings/${id}`),
    enabled: !!id,
  });

  const recordMutation = useMutation({
    mutationFn: ({
      participantId,
      attendanceStatus,
    }: {
      participantId: string;
      attendanceStatus: AttendanceStatus;
    }) => apiPatch(`/v1/meetings/${id}/attendance`, { participantId, attendanceStatus }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["meeting", id] }),
  });

  if (isLoading) return <PageSpinner />;
  if (!meeting) return <div className="p-6 text-navy-400">Réunion introuvable</div>;

  const userId = (session?.user as { id?: string })?.id ?? "";
  const isOrganizer = meeting.organizerId === userId;

  return (
    <>
      <AdminTopBar
        title="Feuille de présence"
        subtitle={`${meeting.title} · ${fmtDate(meeting.event.startAt)} · ${fmtTime(meeting.event.startAt)}`}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <AttendanceTable
          participants={meeting.participants}
          isOrganizer={isOrganizer}
          onRecord={async (participantId, attendanceStatus) => {
            await recordMutation.mutateAsync({ participantId, attendanceStatus });
          }}
        />
      </div>
    </>
  );
}
