"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { apiClient } from "@/lib/api";

interface Props {
  documentId: string;
}

export function ExportMenu({ documentId }: Props) {
  const [open, setOpen] = useState(false);

  const exportPdf = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<Blob>(
        `/v1/documents/${documentId}/export/pdf`,
        {},
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${documentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSettled: () => setOpen(false),
  });

  const exportDocx = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<Blob>(
        `/v1/documents/${documentId}/export/docx`,
        {},
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${documentId}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSettled: () => setOpen(false),
  });

  const isPending = exportPdf.isPending || exportDocx.isPending;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        <ExportIcon />
        {isPending ? "Export…" : "Exporter"}
        <ChevronDown />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => void exportPdf.mutate()}
              disabled={exportPdf.isPending}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <PdfIcon />
              Exporter en PDF
            </button>
            <button
              type="button"
              onClick={() => void exportDocx.mutate()}
              disabled={exportDocx.isPending}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <DocxIcon />
              Exporter en Word
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 10v3h10v-3M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PdfIcon() {
  return <span className="text-[10px] font-bold text-red-600 bg-red-50 rounded px-1">PDF</span>;
}
function DocxIcon() {
  return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded px-1">DOC</span>;
}
