import { Injectable } from "@nestjs/common";

import { AuditService } from "../identity/audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

import type { AuthenticatedUser } from "../common/types/auth.types";
import type { AuditAction } from "@prisma/client";

// ─── Docx module shape (avoids `typeof import()` which ESLint forbids) ────────
interface DocxModule {
  Paragraph: new (...args: unknown[]) => unknown;
  TextRun: new (...args: unknown[]) => unknown;
  HeadingLevel: Record<string, unknown>;
  AlignmentType: Record<string, unknown>;
  Table: new (...args: unknown[]) => unknown;
  TableRow: new (...args: unknown[]) => unknown;
  TableCell: new (...args: unknown[]) => unknown;
  WidthType: Record<string, unknown>;
  BorderStyle: Record<string, unknown>;
  Document: new (...args: unknown[]) => { sections?: unknown };
  Packer: { toBuffer: (doc: unknown) => Promise<Buffer> };
}

// ─── Minimal pdfmake type stubs (v0.3.x ships no .d.ts) ─────────────────────────
type PdfText =
  | {
      text: string | PdfText[];
      bold?: boolean;
      italics?: boolean;
      fontSize?: number;
      color?: string;
      alignment?: string;
      margin?: [number, number, number, number];
      decoration?: string;
    }
  | string;
type PdfContent =
  | PdfText
  | {
      stack?: PdfContent[];
      ul?: string[];
      ol?: string[];
      margin?: [number, number, number, number];
      italics?: boolean;
    }
  | {
      table?: { body: PdfContent[][]; widths?: string[] };
      margin?: [number, number, number, number];
    }
  | { canvas?: unknown[]; margin?: [number, number, number, number] }
  | {
      text: PdfText | PdfText[];
      margin?: [number, number, number, number];
      bold?: boolean;
      fontSize?: number;
      alignment?: string;
    }
  | PdfContent[];
interface TDocumentDefinitions {
  content: PdfContent[];
  defaultStyle?: Record<string, unknown>;
  pageSize?: string;
  pageMargins?: [number, number, number, number];
  footer?: (currentPage: number, pageCount: number) => PdfContent;
}

// ─── TipTap → pdfmake content ────────────────────────────────────────────────

function tiptapToPdfMake(node: Record<string, unknown>): PdfContent[] {
  const type = node["type"] as string | undefined;
  const children = (node["content"] as Record<string, unknown>[] | undefined) ?? [];

  if (type === "doc") {
    return children.flatMap((c) => tiptapToPdfMake(c));
  }

  if (type === "paragraph") {
    const inlines = children.flatMap((c) => tiptapInline(c));
    return inlines.length > 0
      ? [{ text: inlines as PdfText[], margin: [0, 0, 0, 6] as [number, number, number, number] }]
      : [{ text: " ", margin: [0, 0, 0, 6] as [number, number, number, number] }];
  }

  if (type === "heading") {
    const level =
      ((node["attrs"] as Record<string, unknown> | undefined)?.["level"] as number) ?? 1;
    const sizes: Record<number, number> = { 1: 20, 2: 16, 3: 13, 4: 11 };
    const text = children.map((c) => (c["text"] as string) ?? "").join("");
    return [{ text, fontSize: sizes[level] ?? 12, bold: true, margin: [0, 12, 0, 6] }];
  }

  if (type === "bulletList" || type === "orderedList") {
    const items = children.map((li) => {
      const para =
        ((li["content"] as Record<string, unknown>[])?.[0]?.["content"] as Record<
          string,
          unknown
        >[]) ?? [];
      return para.map((c) => (c["text"] as string) ?? "").join("");
    });
    return [
      type === "bulletList"
        ? { ul: items, margin: [0, 0, 0, 6] }
        : { ol: items, margin: [0, 0, 0, 6] },
    ];
  }

  if (type === "blockquote") {
    const inner = children.flatMap((c) => tiptapToPdfMake(c));
    return [{ stack: inner, margin: [16, 0, 0, 6], italics: true }];
  }

  if (type === "horizontalRule") {
    return [
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }],
        margin: [0, 8, 0, 8],
      },
    ];
  }

  if (type === "table") {
    const rows = children.map((row) =>
      ((row["content"] as Record<string, unknown>[]) ?? []).map((cell) => {
        const text =
          (
            (cell["content"] as Record<string, unknown>[])?.[0]?.["content"] as
              | Record<string, unknown>[]
              | undefined
          )
            ?.map((c) => (c["text"] as string) ?? "")
            .join("") ?? "";
        return { text, bold: cell["type"] === "tableHeader" };
      }),
    );
    if (rows.length === 0) return [];
    return [{ table: { body: rows, widths: rows[0]?.map(() => "*") ?? [] }, margin: [0, 0, 0, 8] }];
  }

  return [];
}

function tiptapInline(node: Record<string, unknown>): PdfContent {
  const text = (node["text"] as string) ?? "";
  const marks = (node["marks"] as { type: string }[] | undefined) ?? [];
  const bold = marks.some((m) => m.type === "bold");
  const italic = marks.some((m) => m.type === "italic");
  const decoration = marks.some((m) => m.type === "underline") ? "underline" : undefined;
  return { text, bold, italics: italic, ...(decoration ? { decoration } : {}) };
}

// ─── TipTap → DOCX (via docx package) ────────────────────────────────────────

function tiptapToDocx(node: Record<string, unknown>): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const docx = require("docx") as DocxModule;
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } =
    docx;

  const type = node["type"] as string | undefined;
  const children = (node["content"] as Record<string, unknown>[] | undefined) ?? [];

  if (type === "doc") return children.flatMap((c) => tiptapToDocx(c));

  if (type === "paragraph") {
    const runs = children.map((c) => {
      const marks = (c["marks"] as { type: string }[] | undefined) ?? [];
      return new TextRun({
        text: (c["text"] as string) ?? "",
        bold: marks.some((m) => m.type === "bold"),
        italics: marks.some((m) => m.type === "italic"),
        underline: marks.some((m) => m.type === "underline") ? {} : undefined,
      });
    });
    return [new Paragraph({ children: runs, spacing: { after: 120 } })];
  }

  if (type === "heading") {
    const level =
      ((node["attrs"] as Record<string, unknown> | undefined)?.["level"] as number) ?? 1;
    const levels: Record<number, unknown> = {
      1: HeadingLevel["HEADING_1"],
      2: HeadingLevel["HEADING_2"],
      3: HeadingLevel["HEADING_3"],
      4: HeadingLevel["HEADING_4"],
    };
    const text = children.map((c) => (c["text"] as string) ?? "").join("");
    return [
      new Paragraph({
        text,
        heading: levels[level],
        spacing: { after: 120 },
      }),
    ];
  }

  if (type === "bulletList") {
    return children.map((li) => {
      const text =
        (
          (li["content"] as Record<string, unknown>[])?.[0]?.["content"] as
            | Record<string, unknown>[]
            | undefined
        )
          ?.map((c) => (c["text"] as string) ?? "")
          .join("") ?? "";
      return new Paragraph({ text, bullet: { level: 0 } });
    });
  }

  if (type === "orderedList") {
    return children.map((li, _idx) => {
      const text =
        (
          (li["content"] as Record<string, unknown>[])?.[0]?.["content"] as
            | Record<string, unknown>[]
            | undefined
        )
          ?.map((c) => (c["text"] as string) ?? "")
          .join("") ?? "";
      return new Paragraph({
        text,
        numbering: { reference: "default-numbering", level: 0 },
        spacing: { after: 60 },
      });
    });
  }

  if (type === "blockquote") {
    return children.flatMap((c) => tiptapToDocx(c));
  }

  if (type === "table") {
    const rows = children.map((row) => {
      const cells = ((row["content"] as Record<string, unknown>[]) ?? []).map((cell) => {
        const text =
          (
            (cell["content"] as Record<string, unknown>[])?.[0]?.["content"] as
              | Record<string, unknown>[]
              | undefined
          )
            ?.map((c) => (c["text"] as string) ?? "")
            .join("") ?? "";
        return new TableCell({
          children: [new Paragraph({ text, bold: cell["type"] === "tableHeader" })],
          borders: {
            top: { style: BorderStyle["SINGLE"], size: 1 },
            bottom: { style: BorderStyle["SINGLE"], size: 1 },
            left: { style: BorderStyle["SINGLE"], size: 1 },
            right: { style: BorderStyle["SINGLE"], size: 1 },
          },
        });
      });
      return new TableRow({ children: cells });
    });
    return [new Table({ rows, width: { size: 100, type: WidthType["PERCENTAGE"] } })];
  }

  return [];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportPdf(documentId: string, actor: AuthenticatedUser): Promise<Buffer> {
    const doc = await this.prisma.document.findFirstOrThrow({
      where: { id: documentId, deletedAt: null },
      select: {
        title: true,
        content: true,
        classification: true,
        author: { select: { displayName: true } },
        createdAt: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fonts = require("pdfmake/build/vfs_fonts") as { pdfMake: { vfs: unknown } };

    const isClassified = doc.classification === "SECRET" || doc.classification === "CONFIDENTIAL";
    const classLabel = doc.classification.replace(/_/g, " ");

    const body = tiptapToPdfMake(doc.content as Record<string, unknown>);

    const dd: TDocumentDefinitions = {
      content: [
        ...(isClassified
          ? [
              {
                text: classLabel,
                color: doc.classification === "SECRET" ? "red" : "orange",
                alignment: "center" as const,
                bold: true,
                margin: [0, 0, 0, 12] as [number, number, number, number],
              },
            ]
          : []),
        {
          text: doc.title,
          fontSize: 24,
          bold: true,
          margin: [0, 0, 0, 4] as [number, number, number, number],
        },
        {
          text: `Auteur : ${doc.author.displayName}  |  Date : ${doc.createdAt.toLocaleDateString("fr-FR")}`,
          fontSize: 9,
          color: "#6B7280",
          margin: [0, 0, 0, 20] as [number, number, number, number],
        },
        ...body,
      ],
      defaultStyle: { font: "Helvetica", fontSize: 11, lineHeight: 1.4 },
      pageSize: "A4",
      pageMargins: [60, 60, 60, 60],
      footer: (currentPage: number, pageCount: number) => ({
        text: `Prinodia Workspace — ${classLabel} — Page ${String(currentPage)}/${String(pageCount)}`,
        alignment: "center" as const,
        fontSize: 8,
        color: "#9CA3AF",
        margin: [0, 10, 0, 0] as [number, number, number, number],
      }),
    };

    // Use helvetica (built-in) instead of Roboto
    const ddFinal: TDocumentDefinitions = {
      ...dd,
      defaultStyle: { fontSize: 11, lineHeight: 1.4 },
    };

    return new Promise<Buffer>((resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfmake = require("pdfmake/build/pdfmake") as {
          vfs: unknown;
          createPdf: (dd: TDocumentDefinitions) => {
            getBuffer: (cb: (buf: Buffer) => void) => void;
          };
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        pdfmake.vfs = (fonts as unknown as { pdfMake: { vfs: unknown } }).pdfMake.vfs;
        pdfmake.createPdf(ddFinal).getBuffer((buf) => {
          this.audit.log({
            userId: actor.id,
            action: "DOCUMENT_EXPORTED" as AuditAction,
            entityType: "document",
            entityId: documentId,
            metadata: { format: "PDF" },
          });
          resolve(buf);
        });
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  async exportDocx(documentId: string, actor: AuthenticatedUser): Promise<Buffer> {
    const doc = await this.prisma.document.findFirstOrThrow({
      where: { id: documentId, deletedAt: null },
      select: {
        title: true,
        content: true,
        classification: true,
        author: { select: { displayName: true } },
        createdAt: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Document, Packer, Paragraph, TextRun } = require("docx") as DocxModule;

    const body = tiptapToDocx(doc.content as Record<string, unknown>);
    const classLabel = doc.classification.replace(/_/g, " ");

    const docxDoc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: classLabel,
              bold: true,
              alignment: "center" as const,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: doc.title, bold: true, size: 48 })],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Auteur : ${doc.author.displayName}  |  Date : ${doc.createdAt.toLocaleDateString("fr-FR")}`,
                  size: 18,
                  color: "6B7280",
                }),
              ],
              spacing: { after: 400 },
            }),
            ...((body as { sections?: Array<{ children?: unknown[] }> }).sections?.[0]?.children ??
              []),
          ],
        },
      ],
    });

    const buf = await Packer.toBuffer(docxDoc);
    this.audit.log({
      userId: actor.id,
      action: "DOCUMENT_EXPORTED" as AuditAction,
      entityType: "document",
      entityId: documentId,
      metadata: { format: "DOCX" },
    });
    return buf;
  }
}
