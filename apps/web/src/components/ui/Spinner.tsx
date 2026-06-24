import { cn } from "./cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string | undefined;
  label?: string | undefined;
}

const sizeClasses = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" };

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <div role="status" className={cn("flex items-center gap-2", className)}>
      <svg
        className={cn("animate-spin text-primary-600", sizeClasses[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && <span className="text-sm text-slate-500">{label}</span>}
      <span className="sr-only">{label ?? "Chargement…"}</span>
    </div>
  );
}

export function PageSpinner({ label }: { label?: string | undefined }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
