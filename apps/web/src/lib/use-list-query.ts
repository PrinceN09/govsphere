"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

import type { PaginatedResponse } from "./api";

interface UseListQueryOptions {
  endpoint: string;
  queryKey: string;
  defaultLimit?: number;
}

/**
 * Generic hook for paginated list pages.
 * Manages search, page, and CRUD mutations against a NestJS REST endpoint.
 */
export function useListQuery<T>({ endpoint, queryKey, defaultLimit = 20 }: UseListQueryOptions) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  const params: Record<string, unknown> = { page, limit: defaultLimit };
  if (search) params["search"] = search;
  if (isActiveFilter !== undefined) params["isActive"] = isActiveFilter;

  const query = useQuery({
    queryKey: [queryKey, page, search, isActiveFilter],
    queryFn: () => apiGet<PaginatedResponse<T>>(endpoint, params),
    placeholderData: (prev) => prev,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
    [queryClient, queryKey],
  );

  const createMutation = useMutation({
    mutationFn: (body: unknown) => apiPost<T>(endpoint, body),
    onSuccess: () => {
      void invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      apiPatch<T>(`${endpoint}/${id}`, body),
    onSuccess: () => {
      void invalidate();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`${endpoint}/${id}`),
    onSuccess: () => {
      void invalidate();
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return {
    // Data
    data: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    // Filters
    search,
    page,
    isActiveFilter,
    setIsActiveFilter,
    handleSearch,
    setPage,
    // Mutations
    createMutation,
    updateMutation,
    deactivateMutation,
  };
}
