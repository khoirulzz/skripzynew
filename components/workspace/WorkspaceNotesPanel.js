"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function WorkspaceNotesPanel({ workspaceId, collapsible = false, defaultCollapsed = false, rows = 10 }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("idle");
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const noteRef = doc(db, "workspaces", workspaceId, "notes", "general");
    const unsubscribe = onSnapshot(noteRef, (snapshot) => {
      const nextContent = snapshot.data()?.content || "";
      setContent((current) => (status === "saving" ? current : nextContent));
    });

    return unsubscribe;
  }, [workspaceId, status]);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        setStatus("saving");
        await setDoc(
          doc(db, "workspaces", workspaceId, "notes", "general"),
          {
            content,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setStatus("saved");
      } catch (error) {
        console.error("Gagal menyimpan catatan workspace:", error);
        setStatus("error");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [content, workspaceId]);

  return (
    <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", backgroundColor: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PremiumIcon name="edit3" size={16} className="text-primary" />
          <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Catatan Workspace</h4>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {status === "saving" ? "Menyimpan..." : status === "saved" ? "Tersimpan" : status === "error" ? "Gagal simpan" : "Auto-save aktif"}
          </span>
          {collapsible ? (
            <button className="btn btn-ghost" style={{ padding: "0.3rem" }} onClick={() => setIsExpanded((current) => !current)}>
              <PremiumIcon name={isExpanded ? "chevronDown" : "chevronRight"} size={15} />
            </button>
          ) : null}
        </div>
      </div>

      {!collapsible || isExpanded ? (
        <textarea
          className="form-textarea workspace-scroll"
          rows={rows}
          placeholder="Tulis poin penting, rencana revisi, atau insight pembimbing di sini..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      ) : null}
    </div>
  );
}
