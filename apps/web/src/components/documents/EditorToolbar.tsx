"use client";

import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor;
}

function ToolBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-7 w-7 items-center justify-center rounded text-sm transition-colors",
        active
          ? "bg-primary-100 text-primary-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-slate-200" />;
}

export function EditorToolbar({ editor }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
      {/* Headings */}
      {([1, 2, 3] as const).map((level) => (
        <ToolBtn
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          active={editor.isActive("heading", { level })}
          title={`Titre ${String(level)}`}
        >
          <span className="font-bold text-xs">H{level}</span>
        </ToolBtn>
      ))}

      <Divider />

      {/* Inline marks */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Gras (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italique (Ctrl+I)"
      >
        <span className="italic">I</span>
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Souligné (Ctrl+U)"
      >
        <span className="underline">U</span>
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Barré"
      >
        <span className="line-through text-xs">S</span>
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Code"
      >
        <span className="font-mono text-xs">{"`"}</span>
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Aligner à gauche"
      >
        <AlignLeftIcon />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Centrer"
      >
        <AlignCenterIcon />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Aligner à droite"
      >
        <AlignRightIcon />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justifier"
      >
        <AlignJustifyIcon />
      </ToolBtn>

      <Divider />

      {/* Lists */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Liste à puces"
      >
        <BulletListIcon />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Liste numérotée"
      >
        <OrderedListIcon />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Citation"
      >
        <BlockquoteIcon />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">
        <HrIcon />
      </ToolBtn>

      <Divider />

      {/* Table */}
      <ToolBtn
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insérer un tableau"
      >
        <TableIcon />
      </ToolBtn>

      <Divider />

      {/* History */}
      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Annuler (Ctrl+Z)"
      >
        <UndoIcon />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rétablir (Ctrl+Y)"
      >
        <RedoIcon />
      </ToolBtn>
    </div>
  );
}

// ─── Minimal SVG icons ────────────────────────────────────────────────────────

function AlignLeftIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="1" y="6" width="9" height="2" rx="1" />
      <rect x="1" y="10" width="12" height="2" rx="1" />
      <rect x="1" y="14" width="7" height="2" rx="1" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="3.5" y="6" width="9" height="2" rx="1" />
      <rect x="2" y="10" width="12" height="2" rx="1" />
      <rect x="4.5" y="14" width="7" height="2" rx="1" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="6" y="6" width="9" height="2" rx="1" />
      <rect x="3" y="10" width="12" height="2" rx="1" />
      <rect x="8" y="14" width="7" height="2" rx="1" />
    </svg>
  );
}
function AlignJustifyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="1" y="6" width="14" height="2" rx="1" />
      <rect x="1" y="10" width="14" height="2" rx="1" />
      <rect x="1" y="14" width="8" height="2" rx="1" />
    </svg>
  );
}
function BulletListIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="2" cy="4" r="1.5" />
      <rect x="5" y="3" width="10" height="2" rx="1" />
      <circle cx="2" cy="8" r="1.5" />
      <rect x="5" y="7" width="10" height="2" rx="1" />
      <circle cx="2" cy="12" r="1.5" />
      <rect x="5" y="11" width="10" height="2" rx="1" />
    </svg>
  );
}
function OrderedListIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <text x="0" y="5" fontSize="6" fill="currentColor">
        1.
      </text>
      <rect x="5" y="3" width="10" height="2" rx="1" />
      <text x="0" y="9.5" fontSize="6" fill="currentColor">
        2.
      </text>
      <rect x="5" y="7" width="10" height="2" rx="1" />
      <text x="0" y="14" fontSize="6" fill="currentColor">
        3.
      </text>
      <rect x="5" y="11" width="10" height="2" rx="1" />
    </svg>
  );
}
function BlockquoteIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="3" height="12" rx="1.5" />
      <rect x="6" y="4" width="9" height="2" rx="1" />
      <rect x="6" y="8" width="7" height="2" rx="1" />
    </svg>
  );
}
function HrIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="7" width="14" height="2" rx="1" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="1" width="14" height="14" rx="1" />
      <line x1="1" y1="5" x2="15" y2="5" />
      <line x1="1" y1="10" x2="15" y2="10" />
      <line x1="5.5" y1="5" x2="5.5" y2="15" />
      <line x1="10.5" y1="5" x2="10.5" y2="15" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 6h7a4 4 0 0 1 0 8H6" />
      <path d="M2 6l3-3-3-3" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M14 6H7a4 4 0 0 0 0 8h3" />
      <path d="M14 6l-3-3 3-3" />
    </svg>
  );
}
