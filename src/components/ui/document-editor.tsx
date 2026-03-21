"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Palette,
  ChevronDown,
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

// ─── Font Size Selector ───

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

function FontSizeSelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Get current font size from text style or default
  const currentAttrs = editor.getAttributes("textStyle");
  const currentSize = currentAttrs?.fontSize
    ? parseInt(currentAttrs.fontSize, 10)
    : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Madhesia e fontit"
        className={cn(
          "flex h-8 items-center gap-0.5 rounded-lg px-2 text-xs transition-colors",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "border border-slate-200 dark:border-slate-700"
        )}
      >
        <span className="min-w-[1.5rem] text-center font-medium">
          {currentSize || 16}
        </span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-16 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={cn(
                "block w-full px-3 py-1 text-left text-xs transition-colors",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                currentSize === size && "bg-slate-200 font-semibold dark:bg-slate-700"
              )}
              onClick={() => {
                editor.chain().focus().setFontSize(`${size}px`).run();
                setIsOpen(false);
              }}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Text Color Picker ───

const TEXT_COLORS = [
  "#000000", "#374151", "#6B7280", "#DC2626", "#EA580C",
  "#D97706", "#16A34A", "#0891B2", "#2563EB", "#7C3AED",
  "#DB2777", "#FFFFFF",
];

function TextColorPicker({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentColor = editor.getAttributes("textStyle")?.color || "#000000";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Ngjyra e tekstit"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        <Palette className="h-4 w-4" />
        <span
          className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: currentColor }}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 grid w-[156px] grid-cols-6 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className={cn(
                "h-5 w-5 rounded border transition-transform hover:scale-110",
                currentColor === color
                  ? "border-slate-900 ring-1 ring-slate-400 dark:border-white"
                  : "border-slate-200 dark:border-slate-600"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                editor.chain().focus().setColor(color).run();
                setIsOpen(false);
              }}
            />
          ))}
          <button
            type="button"
            title="Hiq ngjyren"
            className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-[9px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setIsOpen(false);
            }}
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Font Family Selector ───

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "Courier New, monospace" },
  { label: "Trebuchet MS", value: "Trebuchet MS, sans-serif" },
  { label: "Garamond", value: "Garamond, serif" },
];

function FontFamilySelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentFamily = editor.getAttributes("textStyle")?.fontFamily || "";
  const currentLabel =
    FONT_FAMILIES.find((f) => f.value === currentFamily)?.label || "Default";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Fonti"
        className={cn(
          "flex h-8 items-center gap-0.5 rounded-lg px-2 text-xs transition-colors",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "border border-slate-200 dark:border-slate-700"
        )}
      >
        <span className="max-w-[5rem] truncate font-medium">{currentLabel}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-44 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {FONT_FAMILIES.map((font) => (
            <button
              key={font.label}
              type="button"
              className={cn(
                "block w-full px-3 py-1.5 text-left text-xs transition-colors",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                currentFamily === font.value &&
                  "bg-slate-200 font-semibold dark:bg-slate-700"
              )}
              style={{ fontFamily: font.value || "inherit" }}
              onClick={() => {
                if (font.value) {
                  editor.chain().focus().setFontFamily(font.value).run();
                } else {
                  editor.chain().focus().unsetFontFamily().run();
                }
                setIsOpen(false);
              }}
            >
              {font.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Line Spacing Selector ───

const LINE_HEIGHTS = [
  { label: "1.0", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2.0", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3" },
];

function LineSpacingSelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLH = editor.getAttributes("textStyle")?.lineHeight || "";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Hapesira e rreshtave"
        className={cn(
          "flex h-8 items-center gap-0.5 rounded-lg px-1.5 text-xs transition-colors",
          "hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="12" x2="3" y2="12" />
          <line x1="21" y1="18" x2="3" y2="18" />
          <polyline points="7 3 4.5 6 2 3" />
          <polyline points="7 21 4.5 18 2 21" />
        </svg>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-20 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {LINE_HEIGHTS.map((lh) => (
            <button
              key={lh.value}
              type="button"
              className={cn(
                "block w-full px-3 py-1 text-left text-xs transition-colors",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                currentLH === lh.value &&
                  "bg-slate-200 font-semibold dark:bg-slate-700"
              )}
              onClick={() => {
                editor.chain().focus().setLineHeight(lh.value).run();
                setIsOpen(false);
              }}
            >
              {lh.label}
            </button>
          ))}
          <button
            type="button"
            className="block w-full px-3 py-1 text-left text-xs text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              editor.chain().focus().unsetLineHeight().run();
              setIsOpen(false);
            }}
          >
            Default
          </button>
        </div>
      )}
    </div>
  );
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

      {/* Font Family & Size */}
      <FontFamilySelector editor={editor} />
      <FontSizeSelector editor={editor} />

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

      {/* Text Color */}
      <TextColorPicker editor={editor} />

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

      {/* Line Spacing */}
      <LineSpacingSelector editor={editor} />

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
      TextStyleKit.configure({
        fontSize: {},
        fontFamily: {},
        lineHeight: {},
        backgroundColor: {},
      }),
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
