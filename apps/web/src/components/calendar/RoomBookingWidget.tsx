"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Room } from "@/lib/calendar-types";

import { cn } from "@/components/ui/cn";
import { apiGet } from "@/lib/api";

interface Props {
  onSelect?: (roomId: string) => void;
  selectedRoomId?: string;
  startAt?: string;
  endAt?: string;
}

export function RoomBookingWidget({ onSelect, selectedRoomId, startAt, endAt }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>("");

  const params: Record<string, string | boolean> = { isActive: true };
  if (typeFilter) params["type"] = typeFilter;
  if (startAt) params["availableFrom"] = startAt;
  if (endAt) params["availableTo"] = endAt;

  const { data: rooms = [], isLoading } = useQuery<(Room & { availableForSlot?: boolean })[]>({
    queryKey: ["rooms", typeFilter, startAt, endAt],
    queryFn: () => apiGet("/v1/rooms", params),
  });

  const TYPE_LABELS: Record<string, string> = {
    "": "Tous",
    MEETING_ROOM: "Salles de réunion",
    PROJECTOR: "Projecteurs",
    VEHICLE: "Véhicules",
    FACILITY: "Infrastructures",
    EQUIPMENT: "Équipements",
  };

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              typeFilter === value
                ? "bg-primary-600 text-white"
                : "bg-navy-700 text-navy-300 hover:bg-navy-600",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-navy-800 animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <p className="py-4 text-center text-sm text-navy-500">Aucune salle disponible</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {rooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const unavailable = room.availableForSlot === false;

            return (
              <button
                key={room.id}
                onClick={() => !unavailable && onSelect?.(room.id)}
                disabled={unavailable}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2.5 transition-all",
                  isSelected
                    ? "border-primary-500 bg-primary-900/20"
                    : unavailable
                      ? "border-navy-800 bg-navy-900/30 opacity-50 cursor-not-allowed"
                      : "border-navy-700 bg-navy-800 hover:border-navy-600",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{room.name}</p>
                    <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-navy-400">
                      {room.capacity && <span>👤 {room.capacity} pers.</span>}
                      {room.location && <span>📍 {room.location}</span>}
                    </div>
                    {room.amenities.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-navy-500">
                        {room.amenities.slice(0, 3).join(" · ")}
                        {room.amenities.length > 3 && " · ..."}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {unavailable ? (
                      <span className="text-[10px] text-red-400">Indisponible</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400">Disponible</span>
                    )}
                    {isSelected && (
                      <div className="mt-1">
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary-600">
                          <svg
                            className="h-2.5 w-2.5 text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
