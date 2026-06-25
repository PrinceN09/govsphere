"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AdminTopBar } from "@/components/layout/AdminTopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";

interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "PUBLIC" | "PRIVATE" | "ANNOUNCEMENT";
  memberCount: number;
  lastMessageAt: string | null;
  ministry: { id: string; name: string; code: string } | null;
  department: { id: string; name: string; code: string } | null;
}

interface ChannelsResponse {
  data: Channel[];
  nextCursor: string | null;
  hasMore: boolean;
}

const TYPE_BADGE: Record<string, "blue" | "gray" | "yellow"> = {
  PUBLIC: "blue",
  PRIVATE: "gray",
  ANNOUNCEMENT: "yellow",
};
const TYPE_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  PRIVATE: "Privé",
  ANNOUNCEMENT: "Annonces",
};

export default function ChannelsPage() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["channels", search],
    queryFn: () =>
      apiGet<ChannelsResponse>(
        `/v1/channels?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      ),
  });

  const join = useMutation({
    mutationFn: (channelId: string) => apiPost(`/v1/channels/${channelId}/join`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const channels = data?.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <AdminTopBar
        title="Canaux"
        actions={
          <Button size="sm" variant="primary">
            + Nouveau canal
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 max-w-md">
          <Input
            placeholder="Rechercher des canaux…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <PageSpinner />
        ) : channels.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">Aucun canal trouvé.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch) => (
              <Card key={ch.id} className="hover:shadow-md transition-shadow">
                <CardBody className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-slate-400">#</span>
                        <Link
                          href={`/admin/channel/${ch.id}`}
                          className="truncate font-semibold text-slate-900 hover:text-primary-600"
                        >
                          {ch.name}
                        </Link>
                        <Badge variant={TYPE_BADGE[ch.type] ?? "gray"}>
                          {TYPE_LABEL[ch.type] ?? ch.type}
                        </Badge>
                      </div>
                      {ch.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{ch.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>
                          {ch.memberCount} membre{ch.memberCount !== 1 ? "s" : ""}
                        </span>
                        {ch.ministry && <span className="truncate">{ch.ministry.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/admin/channel/${ch.id}`}
                      className="flex-1 inline-flex justify-center items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Ouvrir
                    </Link>
                    {ch.type !== "PRIVATE" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => join.mutate(ch.id)}
                        disabled={join.isPending}
                      >
                        Rejoindre
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
