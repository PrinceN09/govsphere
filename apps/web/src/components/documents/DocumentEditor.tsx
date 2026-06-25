"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { EditorToolbar } from "./EditorToolbar";

import type { Content } from "@tiptap/react";

interface Props {
  content?: Record<string, unknown> | null;
  onChange?: (json: Record<string, unknown>) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function DocumentEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = "Commencez à rédiger...",
  className = "",
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Color,
      CharacterCount,
      Placeholder.configure({ placeholder }),
    ],
    content: (content ?? { type: "doc", content: [{ type: "paragraph" }] }) as Content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON() as Record<string, unknown>);
    },
    immediatelyRender: false,
  });

  // Sync external content changes (e.g. template load)
  useEffect(() => {
    if (!editor || !content) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content);
    if (current !== next) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return (
      <div className={`flex items-center justify-center py-12 text-slate-400 ${className}`}>
        <span className="text-sm">Chargement de l&apos;éditeur…</span>
      </div>
    );
  }

  const wordCount = editor.storage["characterCount"]?.words() as number | undefined;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {!readOnly && <EditorToolbar editor={editor} />}

      <div className="relative flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className={[
            "prose prose-slate max-w-none px-12 py-10",
            "prose-headings:font-semibold prose-headings:text-slate-900",
            "prose-p:text-slate-800 prose-p:leading-relaxed",
            "prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline",
            "prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:px-3 prose-td:py-1.5",
            "prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:px-3 prose-th:py-1.5 prose-th:font-semibold",
            "prose-blockquote:border-l-primary-400 prose-blockquote:text-slate-600",
            "focus:outline-none min-h-[600px]",
            readOnly ? "cursor-default" : "",
          ].join(" ")}
        />
      </div>

      {!readOnly && wordCount !== undefined && (
        <div className="flex items-center justify-end border-t border-slate-100 px-4 py-1.5">
          <span className="text-xs text-slate-400">
            {wordCount.toLocaleString()} mot{wordCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
