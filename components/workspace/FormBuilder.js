"use client";

import { useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function FormBuilder({ workspaceId, onClose }) {
  const [formTitle, setFormTitle] = useState("Kuesioner Penelitian");
  const [formDesc, setFormDesc] = useState("Deskripsi singkat kuesioner Anda...");
  const [questions, setQuestions] = useState([
    { id: Date.now().toString(), type: "short", title: "Siapa nama Anda?", options: [] }
  ]);

  const addQuestion = (type) => {
    setQuestions([...questions, { 
      id: Date.now().toString(), 
      type, 
      title: "Pertanyaan Baru", 
      options: type === "multiple" || type === "dropdown" ? ["Opsi 1"] : []
    }]);
  };

  const updateQuestion = (id, key, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [key]: value } : q));
  };

  const addOption = (qId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) return { ...q, options: [...q.options, `Opsi ${q.options.length + 1}`] };
      return q;
    }));
  };

  const updateOption = (qId, optIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts[optIndex] = value;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = () => {
    // Di sini logika Simpan ke Firestore subcollection form_schema
    alert("Form Schema berhasil disimpan!");
  };

  const formUrl = typeof window !== "undefined" ? `${window.location.origin}/form/${workspaceId}` : "";

  return (
    <div className="flex flex-col h-screen w-full bg-[rgba(0,0,0,0.02)] animate-fade-in">
      <div className="w-full h-full flex flex-col bg-[--background]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <PremiumIcon name="layoutTemplate" size={24} className="text-primary" />
            <h2 className="text-lg font-semibold m-0">Skripzy Form Builder</h2>
          </div>
          <div className="flex bg-[var(--surface-hover)] px-3 py-1.5 rounded-lg border border-[var(--border)] gap-2 items-center">
             <span className="text-xs text-muted">Public Link:</span>
             <a href={formUrl} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium truncate max-w-[200px] hover:underline">
               {formUrl}
             </a>
             <button className="btn btn-ghost !p-1 ml-2" onClick={() => navigator.clipboard.writeText(formUrl)} title="Copy Link">
               <PremiumIcon name="copy" size={14} />
             </button>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} style={{ gap: "0.4rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <PremiumIcon name="save" size={16} /> Simpan Form
            </button>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: "0.5rem" }}>
              <PremiumIcon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Builder Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-[rgba(0,0,0,0.02)]">
          <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-20">
            
            {/* Form Title & Desc Box */}
            <div className="glass-panel p-6 rounded-xl border-t-4 border-t-[var(--primary)] shadow-sm bg-[var(--surface)]">
               <input 
                 className="w-full text-3xl font-bold bg-transparent outline-none border-b border-transparent focus:border-[var(--primary)] transition-colors mb-2"
                 value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
               />
               <textarea 
                 className="w-full text-sm text-[var(--text-muted)] bg-transparent outline-none border-b border-transparent focus:border-[var(--primary)] transition-colors resize-none"
                 rows={2} value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
               />
            </div>

            {/* Questions List */}
            {questions.map((q, index) => (
              <div key={q.id} className={`glass-panel p-6 rounded-xl shadow-sm bg-[var(--surface)] border group relative transition-all hover:border-[var(--primary-light)] ${q.type === 'section' ? 'border-t-4 border-t-[#8B5CF6] mt-4' : 'border-[var(--border)]'}`}>
                
                {/* Delete Button */}
                <button 
                  className="absolute -right-3 -top-3 w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--danger)] hover:border-[var(--danger)]"
                  onClick={() => removeQuestion(q.id)}
                  title="Hapus Pertanyaan"
                >
                  <PremiumIcon name="trash" size={14} />
                </button>

                <div className="flex gap-4 mb-4">
                  {q.type === "section" ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input 
                        className="w-full text-2xl font-bold bg-transparent outline-none border-b border-transparent focus:border-[#8B5CF6] transition-colors"
                        value={q.title} onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                        placeholder="Judul Bagian Variabel"
                      />
                      <input 
                        className="w-full text-sm text-[var(--text-muted)] bg-transparent outline-none border-b border-transparent focus:border-[#8B5CF6] transition-colors"
                        value={q.desc || ""} onChange={(e) => updateQuestion(q.id, "desc", e.target.value)}
                        placeholder="Deskripsi (Opsional, cth: Pilihlah jawaban yang paling menggambarkan...)"
                      />
                    </div>
                  ) : (
                    <input 
                      className="flex-1 text-lg font-medium bg-[var(--background)] border border-[var(--border)] rounded-md px-4 py-2 outline-none focus:border-[var(--primary)]"
                      value={q.title} onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                    />
                  )}

                  {q.type !== "section" && (
                  <select 
                    className="w-48 bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 outline-none text-sm focus:border-[var(--primary)]"
                    value={q.type} onChange={(e) => updateQuestion(q.id, "type", e.target.value)}
                  >
                    <option value="short">Isian Singkat</option>
                    <option value="paragraph">Paragraf</option>
                    <option value="multiple">Pilihan Ganda</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  )}
                </div>

                {/* Question Type Renderer */}
                {q.type !== "section" && (
                  <div className="pl-2">
                    {(q.type === "short" || q.type === "paragraph") && (
                      <div className="text-sm text-[var(--text-muted)] border-b border-dashed border-[var(--border)] pb-2 max-w-[50%]">
                        {q.type === "short" ? "Teks jawaban singkat..." : "Teks jawaban panjang..."}
                      </div>
                    )}

                  {(q.type === "multiple" || q.type === "dropdown") && (
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3">
                          {q.type === "multiple" ? <PremiumIcon name="circle" size={16} className="text-muted" /> : <span className="text-muted text-xs">{optIdx+1}.</span>}
                          <input 
                            className="bg-transparent border-b border-[var(--border)] px-1 py-1 text-sm outline-none w-2/3 focus:border-[var(--primary)] hover:border-[var(--text-muted)]"
                            value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                          />
                        </div>
                      ))}
                      <div className="flex items-center gap-3 mt-2 opacity-60 hover:opacity-100 transition-opacity">
                         {q.type === "multiple" ? <PremiumIcon name="circle" size={16} className="text-muted" /> : <span className="text-muted text-xs">+</span>}
                         <button className="text-sm text-[var(--text-main)] hover:underline outline-none text-left" onClick={() => addOption(q.id)}>
                           Tambahkan opsi
                         </button>
                      </div>
                    </div>
                  )}
                </div>
                )}

              </div>
            ))}

            {/* Add Action Bar */}
            <div className="flex justify-center mt-4">
              <div className="glass-panel p-2 rounded-full inline-flex gap-2 shadow-md border border-[var(--primary-light)]">
                 <button className="btn btn-ghost !p-2 rounded-full text-[var(--primary)] hover:bg-[var(--primary-light)]" title="Tambah Isian Singkat" onClick={() => addQuestion("short")}>
                   <PremiumIcon name="type" size={20} />
                 </button>
                 <button className="btn btn-ghost !p-2 rounded-full text-[var(--primary)] hover:bg-[var(--primary-light)]" title="Tambah Pilihan Ganda" onClick={() => addQuestion("multiple")}>
                   <PremiumIcon name="list" size={20} />
                 </button>
                 <button className="btn btn-ghost !p-2 rounded-full text-[var(--primary)] hover:bg-[var(--primary-light)]" title="Tambah Dropdown" onClick={() => addQuestion("dropdown")}>
                   <PremiumIcon name="chevronDownSquare" size={20} />
                 </button>
                 <div style={{ width: "1px", backgroundColor: "var(--primary-light)", margin: "0 0.5rem" }} />
                 <button className="btn btn-ghost !p-2 rounded-full text-[#8B5CF6] hover:bg-[rgba(139,92,246,0.1)]" title="Tambah Bagian (Variabel / Identitas)" onClick={() => {
                   const newQ = { id: Date.now().toString(), type: "section", title: "Bagian Baru", desc: "" };
                   setQuestions([...questions, newQ]);
                 }}>
                   <PremiumIcon name="box" size={20} />
                 </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
