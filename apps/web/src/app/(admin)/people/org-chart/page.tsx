"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "purple" | "gold";
type OrgNodeType = "ORGANIZATION" | "DIVISION" | "DEPARTMENT" | "TEAM" | "CUSTOM";

interface OrgNode {
  id: string;
  name: string;
  type: OrgNodeType;
  code: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { children: number; employees: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<OrgNodeType, string> = {
  ORGANIZATION: "Organisation",
  DIVISION: "Direction",
  DEPARTMENT: "Département",
  TEAM: "Équipe",
  CUSTOM: "Unité",
};

const TYPE_BADGE: Record<OrgNodeType, BadgeVariant> = {
  ORGANIZATION: "green",
  DIVISION: "yellow",
  DEPARTMENT: "blue",
  TEAM: "gray",
  CUSTOM: "gray",
};

// ─── OrgNode tree item ────────────────────────────────────────────────────────

function OrgNodeItem({
  node,
  organizationId,
  depth,
}: {
  node: OrgNode;
  organizationId: string;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node._count.children > 0;

  const { data: children, isLoading } = useQuery<OrgNode[]>({
    queryKey: ["org-nodes-tree", organizationId, node.id],
    queryFn: () =>
      apiGet<OrgNode[]>(`/v1/people/org-nodes/tree`, {
        organizationId,
        parentId: node.id,
      }),
    enabled: expanded && hasChildren,
  });

  const indentPx = depth * 24;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 rounded-md hover:bg-surface-hover transition-colors group"
        style={{ paddingLeft: `${12 + indentPx}px`, paddingRight: "12px" }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`w-5 h-5 flex items-center justify-center text-muted text-xs shrink-0 transition-transform ${
            !hasChildren ? "opacity-0 pointer-events-none" : ""
          } ${expanded ? "rotate-90" : ""}`}
          aria-label={expanded ? "Réduire" : "Développer"}
        >
          ▶
        </button>

        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: node.color ?? "var(--color-primary, #4f46e5)" }}
        />

        <span className="flex-1 min-w-0 text-sm font-medium truncate">
          {node.icon && <span className="mr-1">{node.icon}</span>}
          {node.name}
          {node.code && (
            <span className="ml-1.5 text-xs text-muted font-normal font-mono">({node.code})</span>
          )}
        </span>

        <Badge variant={TYPE_BADGE[node.type]}>{TYPE_LABELS[node.type]}</Badge>

        {node._count.employees > 0 && (
          <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {node._count.employees} agent{node._count.employees !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {isLoading ? (
            <div
              className="py-1 text-xs text-muted"
              style={{ paddingLeft: `${12 + indentPx + 24}px` }}
            >
              Chargement…
            </div>
          ) : (
            (children ?? []).map((child) => (
              <OrgNodeItem
                key={child.id}
                node={child}
                organizationId={organizationId}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeopleOrgChartPage() {
  const [orgId, setOrgId] = useState("");
  const [inputOrgId, setInputOrgId] = useState("");

  const { data: roots, isLoading } = useQuery<OrgNode[]>({
    queryKey: ["org-nodes-roots", orgId],
    queryFn: () => apiGet<OrgNode[]>(`/v1/people/org-nodes/tree`, { organizationId: orgId }),
    enabled: orgId.length > 0,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminTopBar
        title="Hiérarchie organisationnelle"
        subtitle="Arborescence des unités organisationnelles"
        actions={
          <Link href="/admin/people">
            <Button variant="secondary" size="sm">
              ← Annuaire
            </Button>
          </Link>
        }
      />

      {/* Organization ID input */}
      <div className="px-6 py-4 border-b border-border bg-surface flex gap-3 items-center">
        <label className="text-sm font-medium text-muted shrink-0">ID Organisation :</label>
        <input
          type="text"
          placeholder="Coller l'ID de l'organisation…"
          value={inputOrgId}
          onChange={(e) => setInputOrgId(e.target.value)}
          className="flex-1 max-w-sm h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          size="sm"
          variant="primary"
          onClick={() => setOrgId(inputOrgId.trim())}
          disabled={!inputOrgId.trim()}
        >
          Charger
        </Button>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-auto p-4">
        {!orgId && (
          <div className="py-16 text-center text-muted text-sm">
            Saisissez un ID d&#39;organisation pour afficher sa hiérarchie.
          </div>
        )}

        {orgId && isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-8 bg-border rounded animate-pulse"
                style={{ width: `${50 + (i % 3) * 15}%` }}
              />
            ))}
          </div>
        )}

        {orgId && !isLoading && (roots ?? []).length === 0 && (
          <div className="py-16 text-center text-muted text-sm">
            Aucune unité organisationnelle trouvée pour cet ID.
            <br />
            <span className="text-xs">
              Créez des unités via{" "}
              <code className="bg-surface px-1 rounded">POST /v1/people/org-nodes</code>.
            </span>
          </div>
        )}

        {(roots ?? []).length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden bg-background">
            {(roots ?? []).map((root) => (
              <OrgNodeItem key={root.id} node={root} organizationId={orgId} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
