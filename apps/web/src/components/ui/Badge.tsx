import { cn } from "./cn";

type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "purple";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({ variant = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Renders an active/inactive badge based on a boolean. */
export function StatusBadge({ active, labelActive, labelInactive }: {
  active: boolean;
  labelActive: string;
  labelInactive: string;
}) {
  return (
    <Badge variant={active ? "green" : "red"}>
      {active ? labelActive : labelInactive}
    </Badge>
  );
}
