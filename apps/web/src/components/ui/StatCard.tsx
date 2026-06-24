import { cn } from "./cn";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  accentColor = "bg-primary-600",
  className,
}: StatCardProps) {
  return (
    <div className={cn("border border-slate-200 bg-white", className)}>
      {/* Top accent bar — 2px, uses the card's own colour */}
      <div className={cn("h-0.5 w-full", accentColor)} />
      <div className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-label text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tighter text-slate-900">
            {typeof value === "number" ? value.toLocaleString("fr-CD") : value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center text-white",
            accentColor,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
