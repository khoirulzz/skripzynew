"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

// ==== Toolbar Button ====
function ToolbarBtn({ onClick, active, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: "6px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        background: active ? "var(--primary-light)" : "transparent",
        color: active ? "var(--primary)" : "var(--text-muted)",
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

// ==== AI Floating Menu (Dummy / Local) ====
function AiFloatingMenu({ onClose }) {
  const aiOptions = [
    { icon: "wand",        label: "Perbaiki kalimat ini",    desc: "Grammar & style" },
    { icon: "sparkles",    label: "Perluas paragraf",        desc: "Tambah detail & argumen" },
    { icon: "check",       label: "Ringkas menjadi 1 kalimat", desc: "Simpel & padat" },
    { icon: "bookMarked",  label: "Tambahkan kutipan teori", desc: "Landasan pustaka relevan" },
  ];

  return (
    <div className="glass-panel animate-fade-in" style={{
      minWidth: "260px",
      padding: "0.5rem",
      position: "absolute",
      zIndex: 100,
      left: "50%",
      transform: "translateX(-50%)",
      top: "2.5rem",
      boxShadow: "var(--shadow-lg)",
    }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          ✦ Asisten AI (Segera hadir)
        </span>
      </div>
      {aiOptions.map((opt, i) => (
        <button key={i}
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "flex-start", padding: "0.5rem 0.75rem", gap: "0.75rem", borderRadius: "6px", opacity: 0.6, cursor: "not-allowed" }}
          disabled
          title="Fitur AI akan hadir setelah integrasi Cloudflare Workers"
        >
          <PremiumIcon name={opt.icon} size={16} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-main)", fontWeight: 500 }}>{opt.label}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{opt.desc}</div>
          </div>
        </button>
      ))}
      <button onClick={onClose} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
        <PremiumIcon name="x" size={14} />
      </button>
    </div>
  );
}

// ==== Main Tiptap Editor ====
export function TiptapEditor({ content, onChange, placeholder = "Mulai menulis atau tekan '/' untuk menu AI..." }) {
  const [showAiMenu, setShowAiMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList:    { keepMarks: true },
        orderedList:   { keepMarks: true },
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: "tiptap-placeholder",
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-canvas",
        spellcheck: "false",
      },
    },
    immediatelyRender: false,
  });

  // Sync content from parent (e.g. tab switch)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", false);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "0.5rem 1rem",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        flexWrap: "wrap",
        position: "relative",
      }}>
        <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <PremiumIcon name="bold" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <PremiumIcon name="italic" size={15} />
        </ToolbarBtn>
        
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />

        <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <PremiumIcon name="heading2" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <PremiumIcon name="heading3" size={15} />
        </ToolbarBtn>

        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />

        <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <PremiumIcon name="list" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <PremiumIcon name="listOrdered" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <PremiumIcon name="quote" size={15} />
        </ToolbarBtn>

        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />

        {/* AI Menu trigger (Dummy) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowAiMenu(!showAiMenu)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)",
              backgroundColor: showAiMenu ? "var(--primary-light)" : "var(--surface-hover)",
              color: showAiMenu ? "var(--primary)" : "var(--text-muted)",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s"
            }}
          >
            <PremiumIcon name="sparkles" size={14} />
            AI Assist
          </button>
          {showAiMenu && <AiFloatingMenu onClose={() => setShowAiMenu(false)} />}
        </div>
      </div>

      {/* Editor Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
