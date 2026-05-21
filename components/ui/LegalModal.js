import React, { useEffect } from "react";

export default function LegalModal({ open, onClose, children }) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-3xl relative flex flex-col"
        style={{ 
          maxHeight: "85vh", 
          borderRadius: "1rem", 
          color: "var(--text-main)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-bold" style={{ margin: 0 }}>Ketentuan & Kebijakan</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full"
            style={{ 
              width: "32px", height: "32px", 
              backgroundColor: "rgba(var(--surface-rgb), 0.5)",
              color: "var(--text-muted)",
              transition: "all 0.2s"
            }}
            aria-label="Tutup"
            onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "rgba(var(--surface-rgb), 0.5)"; }}
          >
            <span style={{ fontSize: "1.25rem", lineHeight: 1, marginTop: "-2px" }}>&times;</span>
          </button>
        </div>
        <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
