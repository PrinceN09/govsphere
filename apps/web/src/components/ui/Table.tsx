import { cn } from "./cn";

// ─── Table shell ──────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-lg border border-gray-200 bg-white", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
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
      className={cn("transition-colors", onClick && "cursor-pointer hover:bg-gray-50", className)}
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
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500",
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
  return (
    <td className={cn("px-4 py-3 text-gray-700", className)}>{children}</td>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function TableEmpty({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={99} className="py-16 text-center text-sm text-gray-400">
        {message}
      </td>
    </tr>
  );
}
