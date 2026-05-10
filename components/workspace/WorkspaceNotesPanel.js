"use client";

import { useEffect, useState } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function WorkspaceNotesPanel({ workspaceId, collapsible = false, defaultCollapsed = false, rows = 10 }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("idle");
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchNote() {
      try {
        const resp = await d1Request("workspace_notes");
        const note = (resp.data || []).find(n => n.workspace_id === workspaceId && n.id === "general");
        if (isMounted && status !== "saving") {
          setContent(note?.content || "");
        }
      } catch (e) {
        console.error("Failed to fetch notes:", e);
      }
    }

    fetchNote();
    const interval = setInterval(fetchNote, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [workspaceId, status]);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        setStatus("saving");
        // Upsert: try PATCH first, if fails, POST
        try {
          await d1Request("workspace_notes", {
            method: "PATCH",
            id: "general",
            body: { content }
          });
        } catch {
          await d1Request("workspace_notes", {
            method: "POST",
            body: {
              id: "general",
              workspace_id: workspaceId,
              content
            }
          });
        }
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
