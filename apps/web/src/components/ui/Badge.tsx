import { cn } from "./cn";

type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "purple" | "gold";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-success-100 text-success-700 ring-success-200",
  red: "bg-danger-100 text-danger-700 ring-danger-200",
  yellow: "bg-warning-100 text-warning-700 ring-warning-200",
  blue: "bg-primary-100 text-primary-700 ring-primary-200",
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-purple-100 text-purple-700 ring-purple-200",
  gold: "bg-gold-100 text-gold-700 ring-gold-200",
};

export function Badge({ variant = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wide ring-1 ring-inset",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Active/inactive badge based on a boolean. */
export function StatusBadge({
  active,
  labelActive,
  labelInactive,
}: {
  active: boolean;
  labelActive: string;
  labelInactive: string;
}) {
  return <Badge variant={active ? "green" : "red"}>{active ? labelActive : labelInactive}</Badge>;
}
