"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

function createDraft() {
  return {
    title: "",
    role: "",
    interviewDate: "",
    tags: "",
    excerpt: "",
    content: "",
  };
}

export function TranscriptManager({ workspaceId }) {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(createDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const transcriptsQuery = query(
      collection(db, "workspaces", workspaceId, "transcripts"),
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(transcriptsQuery, (snapshot) => {
      const nextItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setTranscripts(nextItems);

      if (!selectedId && nextItems[0]) {
        setSelectedId(nextItems[0].id);
      }
    });

    return unsubscribe;
  }, [workspaceId, selectedId]);

  const selectedTranscript = useMemo(
    () => transcripts.find((item) => item.id === selectedId) || null,
    [selectedId, transcripts]
  );

  const handleCreate = async () => {
    const created = await addDoc(collection(db, "workspaces", workspaceId, "transcripts"), {
      title: "Transkrip Baru",
      role: "",
      interviewDate: "",
      tags: [],
      excerpt: "",
      content: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSelectedId(created.id);
    setDraft(createDraft());
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "workspaces", workspaceId, "transcripts", selectedId), {
        title: draft.title,
        role: draft.role,
        interviewDate: draft.interviewDate,
        tags: draft.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        excerpt: draft.excerpt,
        content: draft.content,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Gagal menyimpan transkrip:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await deleteDoc(doc(db, "workspaces", workspaceId, "transcripts", selectedId));
    setSelectedId(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 300px) minmax(0, 1fr)", gap: "1rem", minHeight: "520px" }}>
      <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem", backgroundColor: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Daftar Transkrip</h3>
            <p style={{ fontSize: "0.78rem", margin: "0.25rem 0 0 0" }}>Kelola wawancara dan catatan lapangan.</p>
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            <PremiumIcon name="plus" size={14} />
            Baru
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", overflowY: "auto" }}>
          {transcripts.length === 0 ? (
            <div style={{ padding: "1rem", border: "1px dashed var(--border)", borderRadius: "10px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Belum ada transkrip.
            </div>
          ) : (
            transcripts.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setDraft({
                    title: item.title || "",
                    role: item.role || "",
                    interviewDate: item.interviewDate || "",
                    tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
                    excerpt: item.excerpt || "",
                    content: item.content || "",
                  });
                }}
                className="btn btn-ghost"
                style={{
                  display: "block",
                  textAlign: "left",
                  padding: "0.85rem",
                  border: item.id === selectedId ? "1px solid var(--primary)" : "1px solid var(--border)",
                  borderRadius: "10px",
                  backgroundColor: item.id === selectedId ? "var(--primary-light)" : "var(--surface)",
                }}
              >
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)" }}>{item.title || "Tanpa Judul"}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                  {item.role || "Peran belum diisi"} {item.interviewDate ? `• ${item.interviewDate}` : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1rem 1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem", backgroundColor: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Editor Transkrip</h3>
            <p style={{ fontSize: "0.78rem", margin: "0.25rem 0 0 0" }}>Simpan kutipan penting dan tag tema untuk Bab IV.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-outline" onClick={handleSave} disabled={!selectedId || saving}>
              <PremiumIcon name="save" size={14} />
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button className="btn btn-ghost" onClick={handleDelete} disabled={!selectedId}>
              <PremiumIcon name="trash" size={14} />
            </button>
          </div>
        </div>

        {!selectedId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "10px", color: "var(--text-muted)" }}>
            Pilih atau buat transkrip baru untuk mulai mengedit.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Judul / Informan</label>
                <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Peran Informan</label>
                <input className="form-input" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tanggal Wawancara</label>
                <input type="date" className="form-input" value={draft.interviewDate} onChange={(event) => setDraft((current) => ({ ...current, interviewDate: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tag Tema</label>
                <input className="form-input" placeholder="mis. motivasi, kendala, dukungan" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Excerpt Penting</label>
              <textarea className="form-textarea" rows={3} value={draft.excerpt} onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))} />
            </div>

            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label">Isi Transkrip / Catatan Lapangan</label>
              <textarea className="form-textarea" rows={12} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
