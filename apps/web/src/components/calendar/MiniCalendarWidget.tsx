"use client";

import { useState } from "react";

import { cn } from "@/components/ui/cn";

interface Props {
  selected?: Date;
  onSelect?: (date: Date) => void;
  highlightedDates?: Date[];
}

const DAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function MiniCalendarWidget({ selected, onSelect, highlightedDates = [] }: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selected ?? today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // First day of month, adjusted to Monday-start week
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <div className="w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-navy-700 text-navy-300 hover:text-white transition-colors"
          aria-label="Mois précédent"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <span className="text-sm font-semibold text-white">
          {MONTHS_FR[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-navy-700 text-navy-300 hover:text-white transition-colors"
          aria-label="Mois suivant"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-navy-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const isToday = isSameDay(date, today);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const hasEvent = highlightedDates.some((d) => isSameDay(d, date));

          return (
            <button
              key={i}
              onClick={() => onSelect?.(date)}
              className={cn(
                "relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
                isSelected
                  ? "bg-primary-600 text-white font-semibold"
                  : isToday
                    ? "bg-navy-700 text-primary-400 font-semibold"
                    : "text-navy-200 hover:bg-navy-700",
              )}
            >
              {date.getDate()}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
