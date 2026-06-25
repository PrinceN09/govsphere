import type { FC } from "react";

type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET";

const CONFIG: Record<Classification, { label: string; className: string }> = {
  PUBLIC: { label: "PUBLIC", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  INTERNAL: { label: "INTERNE", className: "bg-blue-100 text-blue-800 border-blue-200" },
  CONFIDENTIAL: {
    label: "CONFIDENTIEL",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  SECRET: { label: "SECRET", className: "bg-red-100 text-red-800 border-red-200" },
};

interface Props {
  classification: Classification;
  size?: "sm" | "md";
}

export const ClassificationBadge: FC<Props> = ({ classification, size = "sm" }) => {
  const cfg = CONFIG[classification];
  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded border font-semibold tracking-wide ${px} ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
};
