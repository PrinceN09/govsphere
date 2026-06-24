import { cn } from "./cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Authority variant — adds a gold left border for important sections */
  authority?: boolean;
}

export function Card({ children, className, authority = false }: CardProps) {
  return (
    <div
      className={cn(
        "border border-slate-200 bg-white",
        authority && "authority-bar border-l-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, actions, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-slate-200 px-5 py-4",
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
