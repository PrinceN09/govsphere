import { cn } from "./cn";

// ─── Table shell ──────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto border border-slate-200 bg-white", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-slate-200 bg-slate-50">{children}</thead>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-slate-50/70",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-label text-slate-500",
        "whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 text-slate-700", className)}>{children}</td>;
}

// ─── Empty row ────────────────────────────────────────────────────────────────

export function TableEmpty({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={99} className="py-16 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
}
