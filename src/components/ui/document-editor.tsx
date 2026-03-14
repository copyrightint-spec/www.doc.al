"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Undo2,
  Redo2,
  Minus,
  Quote,
  Highlighter,
  Type,
  Pilcrow,
  TableCellsMerge,
  Trash2,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Word/Office Paste Cleanup ───

function transformPastedHTML(html: string): string {
  // Remove Word-specific XML tags and comments
  let cleaned = html
    .replace(/<!\[if[^>]*>[\s\S]*?<!\[endif\]>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:[^>]*>/gi, "")
    .replace(/<\/?v:[^>]*>/gi, "")
    .replace(/<\/?w:[^>]*>/gi, "")
    .replace(/<\/?m:[^>]*>/gi, "")
    .replace(/<\/?st1:[^>]*>/gi, "");

  // Remove class attributes (Word adds MsoNormal, etc.)
  cleaned = cleaned.replace(/\s*class="[^"]*"/gi, "");

  // Convert Word-style bold/italic spans
  cleaned = cleaned.replace(
    /<span[^>]*font-weight\s*:\s*(bold|[7-9]00)[^>]*>([\s\S]*?)<\/span>/gi,
    "<strong>$2</strong>"
  );
  cleaned = cleaned.replace(
    /<span[^>]*font-style\s*:\s*italic[^>]*>([\s\S]*?)<\/span>/gi,
    "<em>$2</em>"
  );
  cleaned = cleaned.replace(
    /<span[^>]*text-decoration\s*:\s*underline[^>]*>([\s\S]*?)<\/span>/gi,
    "<u>$2</u>"
  );

  // Preserve text-align from Word paragraphs
  cleaned = cleaned.replace(
    /<p[^>]*text-align\s*:\s*(center|right|justify)[^>]*>/gi,
    (match, align) => `<p style="text-align: ${align}">`
  );

  // Convert Word margin-left indentation to nested lists or keep as-is
  // Remove remaining inline styles except text-align
  cleaned = cleaned.replace(/\s*style="(?![^"]*text-align)[^"]*"/gi, "");

  // Remove empty spans
  cleaned = cleaned.replace(/<span>([\s\S]*?)<\/span>/gi, "$1");

  // Remove Word-specific font tags
  cleaned = cleaned.replace(/<\/?font[^>]*>/gi, "");

  // Normalize list items — Word often wraps content in <p> inside <li>
  // Keep the <p> inside <li> as TipTap expects it

  // Clean up empty paragraphs (but keep <br> for spacing)
  cleaned = cleaned.replace(/<p[^>]*>\s*&nbsp;\s*<\/p>/gi, "<p><br></p>");
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, "");

  // Remove zero-width spaces and non-breaking spaces in empty elements
  cleaned = cleaned.replace(/[\u200B\uFEFF]/g, "");

  return cleaned;
}

// ─── Toolbar Button ───

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        "hover:bg-slate-100 dark:hover:bg-slate-800",
        "disabled:cursor-not-allowed disabled:opacity-30",
        active && "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />;
}

// ─── Toolbar ───

function EditorToolbar({ editor }: { editor: Editor }) {
  const addImage = useCallback(() => {
    const url = window.prompt("URL e imazhit:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/80 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/80">
      {/* Text Style */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph") && !editor.isActive("heading")}
        title="Paragraf"
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Titull 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Titull 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Titull 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Format */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="Thekso"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Majtas"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Qender"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Djathtas"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Lista me pika"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Lista me numra"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Citim"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Vije ndarese"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addTable} title="Shto tabele">
        <TableIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Shto imazh">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      {/* Table actions (visible when inside table) */}
      {editor.isActive("table") && (
        <>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Shto kolone"
          >
            <Plus className="h-3.5 w-3.5" />
            <Type className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Shto rresht"
          >
            <Plus className="h-3.5 w-3.5" />
            <TableCellsMerge className="h-3 w-3" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Fshi tabelen"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </ToolbarButton>
        </>
      )}

      <div className="flex-1" />

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Zhbej (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Ribej (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

// ─── Main Editor Component ───

interface DocumentEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  className?: string;
  editable?: boolean;
}

export function DocumentEditor({
  content = "",
  onChange,
  className,
  editable = true,
}: DocumentEditorProps) {
  const contentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Filloni te shkruani dokumentin tuaj ketu...",
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "doc-table",
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        HTMLAttributes: {
          class: "doc-image",
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      contentRef.current = html;
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: "doc-editor-content",
      },
      // Preserve formatting when pasting from Word, ChatGPT, etc.
      transformPastedHTML(html) {
        return transformPastedHTML(html);
      },
    },
  });

  // Sync content prop changes into editor (e.g., when switching steps)
  useEffect(() => {
    if (editor && content !== contentRef.current) {
      contentRef.current = content;
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  // Sync editable prop
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className={cn("doc-editor overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950", className)}>
      {editable && <EditorToolbar editor={editor} />}
      <div className="doc-editor-wrapper overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function useDocumentEditor() {
  return useEditor;
}
