import { cn } from "./cn";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  accentColor?: string;
}

export function StatCard({ label, value, icon, className, accentColor = "bg-primary-600" }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-gray-100 bg-white p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString("fr-CD") : value}
          </p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg text-white", accentColor)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
