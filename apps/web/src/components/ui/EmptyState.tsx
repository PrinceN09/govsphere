import { Button } from "./Button";
import { cn } from "./cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-slate-200 bg-slate-50 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-slate-500">{description}</p>}
      {action && (
        <Button className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
