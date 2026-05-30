"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Underline } from "@tiptap/extension-underline";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useCallback, useEffect, useRef, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/components/providers/AuthProvider";
import { generateWorkspaceChapter } from "@/lib/workspacePublicApi";
import { deductCredits } from "@/lib/credits";

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

// ==== Custom Instruction Popup ====
// Defined at module-level so it never gets re-created on parent re-render
function CustomInstructionPopup({ onSubmit, onClose }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Small delay so the button click doesn't immediately steal focus
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: "110%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        width: "min(320px, 90vw)",
      }}
      // Prevent clicks inside the popup from bubbling to editor (which would collapse selection)
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className="glass-panel"
        style={{
          padding: "0.75rem",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            ✦ Instruksi Khusus
          </span>
          <button
            onMouseDown={e => { e.preventDefault(); onClose(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}
          >
            <PremiumIcon name="x" size={13} />
          </button>
        </div>
        <textarea
          ref={inputRef}
          rows={3}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Contoh: Ubah menjadi lebih formal, tambahkan transisi, atau pertahankan kata kunci..."
          className="form-textarea"
          style={{ fontSize: "0.8rem", resize: "none" }}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (value.trim()) onSubmit(value.trim());
            }
          }}
        />
        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
            onMouseDown={e => { e.preventDefault(); onClose(); }}
          >
            Batal
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }}
            disabled={!value.trim()}
            onMouseDown={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}
          >
            <PremiumIcon name="sparkles" size={13} />
            Proses (1 Kredit)
          </button>
        </div>
      </div>
    </div>
  );
}

// ==== AI Action Buttons ====
// CRITICAL: Defined at module-level (outside TiptapEditor) so React does NOT
// remount this subtree on every parent state change — prevents flickering.
function AiActionButtons({ onAction, isProcessing, showCustomInstruction, onToggleCustomInstruction, compact = false }) {
  const sep = <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)", margin: "0 2px", flexShrink: 0 }} />;
  const btnStyle = (extraColor) => ({
    padding: compact ? "0.25rem 0.45rem" : "0.3rem 0.6rem",
    fontSize: compact ? "0.7rem" : "0.75rem",
    borderRadius: "6px",
    gap: "0.3rem",
    whiteSpace: "nowrap",
    flexShrink: 0,
    ...(extraColor ? { color: extraColor } : {}),
  });
  const iconSz = compact ? 12 : 14;

  if (isProcessing) {
    return (
      <div style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <LoadingSpinner size={iconSz} className="text-primary" />
        AI memproses...
      </div>
    );
  }

  return (
    <>
      <button
        onMouseDown={e => { e.preventDefault(); onAction("grammar"); }}
        className="btn btn-ghost"
        style={btnStyle()}
        title="Perbaiki Ejaan & Tata Bahasa (1 Kredit)"
      >
        <PremiumIcon name="wand" size={iconSz} />
        Perbaiki
      </button>
      {sep}
      <button
        onMouseDown={e => { e.preventDefault(); onAction("paraphrase"); }}
        className="btn btn-ghost"
        style={btnStyle()}
        title="Parafrase Teks (1 Kredit)"
      >
        <PremiumIcon name="refreshCw" size={iconSz} />
        Parafrase
      </button>
      {sep}
      <button
        onMouseDown={e => { e.preventDefault(); onAction("summarize"); }}
        className="btn btn-ghost"
        style={btnStyle()}
        title="Buat Ringkasan (1 Kredit)"
      >
        <PremiumIcon name="minimize2" size={iconSz} />
        Ringkas
      </button>
      {sep}
      <button
        onMouseDown={e => { e.preventDefault(); onAction("humanize"); }}
        className="btn btn-ghost"
        style={btnStyle("var(--success)")}
        title="Humanize — buat teks lebih alami (1 Kredit)"
      >
        <PremiumIcon name="heart" size={iconSz} />
        Humanize
      </button>
      {sep}
      {/* Custom Instruction with its popup */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onMouseDown={e => { e.preventDefault(); onToggleCustomInstruction(); }}
          className="btn btn-ghost"
          style={{
            ...btnStyle(),
            ...(showCustomInstruction ? { color: "var(--primary)", background: "var(--primary-light)" } : {}),
          }}
          title="Instruksi Khusus — beri arahan sendiri (1 Kredit)"
        >
          <PremiumIcon name="messageCircleMore" size={iconSz} />
          {compact ? "Instruksi" : "Instruksi Khusus"}
        </button>
        {showCustomInstruction && (
          <CustomInstructionPopup
            onClose={onToggleCustomInstruction}
            onSubmit={(instruction) => onAction("custom", instruction)}
          />
        )}
      </div>
    </>
  );
}

// ==== Old toolbar AI dropdown (kept as placeholder) ====
function AiFloatingMenu({ onClose }) {
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
          ✦ Asisten AI — pilih teks dulu
        </span>
      </div>
      <p style={{ margin: "0.5rem 0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        Blok/seleksi teks di editor, lalu pilih aksi AI yang muncul di pop-up.
      </p>
      <button onClick={onClose} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
        <PremiumIcon name="x" size={14} />
      </button>
    </div>
  );
}

// ==== Main Tiptap Editor ====
export function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = "Mulai menulis atau tekan '/' untuk menu AI...",
  isMobile: isMobileProp 
}) {
  const { user } = useAuth();
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showCustomInstruction, setShowCustomInstruction] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileAiBarVisible, setMobileAiBarVisible] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Capture editor ref for use inside callbacks without causing re-renders
  const editorRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        if (editorRef.current) {
          editorRef.current.chain().focus().setImage({ src: compressedBase64 }).run();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    
    const checkMobile = () => {
      if (isMobileProp !== undefined) {
        setIsMobile(isMobileProp);
      } else {
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [isMobileProp]);

  // Stable AI executor — defined with useCallback so reference doesn't change on re-render
  const handleAiAction = useCallback(async (actionType, text, customInstruction = "") => {
    if (!user) { alert("Anda harus login untuk menggunakan fitur AI."); return null; }
    const cost = 1;
    try {
      await deductCredits(user.uid, cost);
      let prompt = "";
      if (actionType === "grammar") {
        prompt = `Perbaiki ejaan, tanda baca, dan tata bahasa dari teks berikut agar sesuai dengan gaya penulisan akademik yang baku. Jangan menambah argumen baru. HANYA KEMBALIKAN TEKS HASIL PERBAIKAN, tanpa tanda kutip atau markdown tambahan:\n\n${text}`;
      } else if (actionType === "paraphrase") {
        prompt = `Parafrase teks berikut agar menggunakan gaya bahasa akademik yang berbeda namun tetap mempertahankan esensi dan makna aslinya. HANYA KEMBALIKAN TEKS HASIL PARAFRASE, tanpa tanda kutip atau markdown tambahan:\n\n${text}`;
      } else if (actionType === "summarize") {
        prompt = `Buatlah ringkasan yang sangat padat dan jelas dari teks berikut (maksimal 1-2 kalimat). HANYA KEMBALIKAN TEKS HASIL RINGKASAN, tanpa tanda kutip atau markdown tambahan:\n\n${text}`;
      } else if (actionType === "humanize") {
        prompt = `Tulis ulang teks berikut agar terasa lebih alami dan manusiawi — kurangi nuansa robot/AI, buat kalimatnya mengalir lebih organik dan hidup, namun tetap formal dan akademik jika diperlukan. HANYA KEMBALIKAN TEKS HASIL PENULISAN ULANG, tanpa tanda kutip atau markdown tambahan:\n\n${text}`;
      } else if (actionType === "custom") {
        prompt = `Berikut adalah instruksi dari penulis: "${customInstruction}".\n\nTerapkan instruksi tersebut pada teks di bawah ini. HANYA KEMBALIKAN HASILNYA, tanpa pengantar atau tanda kutip tambahan:\n\n${text}`;
      }
      const result = await generateWorkspaceChapter({ prompt, group: "group_2,group_3", model: "gemini-flash-latest", temperature: 0.6 });
      return result.text;
    } catch (err) {
      console.error("AI Refactor error:", err);
      alert(err.message || "Gagal memproses teks dengan AI.");
      return null;
    }
  }, [user]);

  // Stable action dispatcher passed to AiActionButtons
  const onAiAction = useCallback(async (actionType, customInstruction = "") => {
    const editor = editorRef.current;
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text || text.trim() === "") return;

    setShowCustomInstruction(false);
    setIsAiProcessing(true);
    // Don't close mobile bar immediately so user sees the loading state
    
    try {
      const newText = await handleAiAction(actionType, text, customInstruction);
      if (newText) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
        setMobileAiBarVisible(false); // Only close after success
      }
    } finally {
      setIsAiProcessing(false);
    }
  }, [handleAiAction]);

  const toggleCustomInstruction = useCallback(() => {
    setShowCustomInstruction(prev => !prev);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Placeholder.configure({ placeholder, emptyNodeClass: "tiptap-placeholder" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Underline,
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          setTimeout(() => setMobileAiBarVisible(true), 350);
        } else {
          setMobileAiBarVisible(false);
        }
      }
    },
    editorProps: {
      attributes: { class: "tiptap-canvas", spellcheck: "false" },
    },
    immediatelyRender: false,
  });

  // Keep editor ref in sync
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync content from parent (e.g. tab switch)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

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
        <ToolbarBtn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <PremiumIcon name="undo" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <PremiumIcon name="redo" size={15} />
        </ToolbarBtn>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />
        <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <PremiumIcon name="bold" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <PremiumIcon name="italic" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <PremiumIcon name="underline" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <PremiumIcon name="strikethrough" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <PremiumIcon name="subscript" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <PremiumIcon name="superscript" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <PremiumIcon name="highlight" size={15} />
        </ToolbarBtn>
        <label
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", transition: "all 0.15s ease" }}
          title="Teks Warna"
        >
          <input
            type="color"
            onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
            value={editor.getAttributes("textStyle").color || "#000000"}
            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
          />
          <PremiumIcon name="palette" size={15} color={editor.getAttributes("textStyle").color || "var(--text-muted)"} />
        </label>
        <ToolbarBtn title="Hapus Format" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <PremiumIcon name="clearFormat" size={15} />
        </ToolbarBtn>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />
        <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <PremiumIcon name="heading2" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <PremiumIcon name="heading3" size={15} />
        </ToolbarBtn>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />
        <ToolbarBtn title="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <PremiumIcon name="alignLeft" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <PremiumIcon name="alignCenter" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <PremiumIcon name="alignRight" size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <PremiumIcon name="alignJustify" size={15} />
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
        
        {/* Table Tool */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <ToolbarBtn 
            title="Tabel" 
            active={editor.isActive("table")} 
            onClick={() => {
              if (editor.isActive("table")) {
                setShowTableMenu(!showTableMenu);
              } else {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              }
            }}
          >
            <PremiumIcon name="table" size={15} />
          </ToolbarBtn>
          {editor.isActive("table") && showTableMenu && (
            <>
              <div 
                style={{ position: "fixed", inset: 0, zIndex: 90 }} 
                onClick={() => setShowTableMenu(false)} 
              />
              <div className="glass-panel" style={{
                position: "absolute",
                top: "110%",
                left: 0,
                zIndex: 100,
                padding: "0.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                minWidth: "160px",
                boxShadow: "var(--shadow-lg)",
                backgroundColor: "var(--surface)",
              }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="chevronUp" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Tambah Baris Atas</span>
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="chevronDown" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Tambah Baris Bawah</span>
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="chevronLeft" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Tambah Kolom Kiri</span>
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="chevronRight" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Tambah Kolom Kanan</span>
                </button>
                <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "2px 0" }} />
                <button 
                  className="btn btn-ghost text-danger" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="trash" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Hapus Baris</span>
                </button>
                <button 
                  className="btn btn-ghost text-danger" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="trash" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Hapus Kolom</span>
                </button>
                <button 
                  className="btn btn-ghost text-danger" 
                  style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.3rem 0.5rem", width: "100%" }} 
                  onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                >
                  <PremiumIcon name="trash2" size={12} style={{ marginRight: "0.4rem" }} />
                  <span>Hapus Tabel</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Image Tool */}
        <label 
          title="Sisipkan Gambar" 
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "6px", transition: "all 0.15s ease", color: "var(--text-muted)" }} 
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"} 
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
          />
          <PremiumIcon name="image" size={15} />
        </label>
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border)", margin: "0 4px" }} />
        {/* AI Menu trigger */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowAiMenu(!showAiMenu)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)",
              backgroundColor: showAiMenu ? "var(--primary-light)" : "var(--surface-hover)",
              color: showAiMenu ? "var(--primary)" : "var(--text-muted)",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            <PremiumIcon name="sparkles" size={14} />
            AI Assist
          </button>
          {showAiMenu && <AiFloatingMenu onClose={() => setShowAiMenu(false)} />}
        </div>
      </div>

      {/* Mobile AI Bar — appears BELOW toolbar when text is selected on touch devices */}
      {isTouchDevice && mobileAiBarVisible && (
        <div style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "4px 0",
          padding: "0.5rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          position: "relative",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--primary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            flexShrink: 0,
            marginRight: "0.5rem",
            whiteSpace: "nowrap",
          }}>
            ✦ AI
          </span>
          <AiActionButtons
            onAction={onAiAction}
            isProcessing={isAiProcessing}
            showCustomInstruction={showCustomInstruction}
            onToggleCustomInstruction={toggleCustomInstruction}
            compact
          />
          <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)", margin: "0 4px", flexShrink: 0 }} />
          <button
            onClick={() => setMobileAiBarVisible(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem", flexShrink: 0 }}
          >
            <PremiumIcon name="x" size={14} />
          </button>
        </div>
      )}

      {/* Wrapper for scroll container and loader */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Editor Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "1rem" : "2rem" }}>
          {/* BubbleMenu — only on non-touch (desktop) */}
          {!isTouchDevice && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{ 
                duration: 150, 
                interactive: true,
                boundary: "viewport",
                maxWidth: "min(400px, 90vw)"
              }}
              className="glass-panel"
              style={{
                display: "flex",
                gap: "0.2rem",
                padding: "0.4rem",
                borderRadius: "8px",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                alignItems: "center",
                position: "relative",
                flexWrap: "wrap",
              }}
            >
              <AiActionButtons
                onAction={onAiAction}
                isProcessing={isAiProcessing}
                showCustomInstruction={showCustomInstruction}
                onToggleCustomInstruction={toggleCustomInstruction}
              />
            </BubbleMenu>
          )}
          <EditorContent editor={editor} className={isAiProcessing ? "tiptap-ai-refactoring" : ""} />
        </div>

        {/* ANIMASI AI MEMPROSES */}
        {isAiProcessing && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "0.5rem",
            pointerEvents: "auto"
          }}>
            {/* Blurry Backdrop Overlay */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(var(--background-rgb), 0.4)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              zIndex: 1
            }} />

            {/* Content Container (On top of blur) */}
            <div style={{
              position: "relative",
              zIndex: 2,
              padding: "0.75rem 1.25rem",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--primary)",
              borderRadius: "var(--radius-full)",
              boxShadow: "0 0 15px rgba(99,102,241,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              color: "var(--primary)",
              fontWeight: 600
            }}>
              <PremiumIcon name="sparkles" size={18} className="animate-pulse" />
              AI sedang memperbaiki teks...
              <LoadingSpinner size={16} className="text-primary" />
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .tiptap-ai-refactoring .ProseMirror-selectednode,
        .tiptap-ai-refactoring .ProseMirror ::selection {
          background-color: rgba(99, 102, 241, 0.2) !important;
          animation: tiptap-scan 2s infinite ease-in-out;
        }

        @keyframes tiptap-scan {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; background-color: rgba(99, 102, 241, 0.4) !important; }
        }

        .tiptap-canvas {
          outline: none !important;
          min-height: 500px;
        }
        
        /* Hide scrollbar for mobile AI bar but allow scrolling */
        .mobile-ai-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
