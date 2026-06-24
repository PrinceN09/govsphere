import { cn } from "./cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <div role="status" className={cn("flex items-center gap-2", className)}>
      <svg
        className={cn("animate-spin text-primary-600", sizeClasses[size])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label && <span className="text-sm text-gray-500">{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
