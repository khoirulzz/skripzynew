'use client';

import React, { useState, useEffect } from 'react';
import { FormTemplate, Section, SectionType, QuestionType, FormResponse, Question } from '@/lib/types';
import { generateMockResponses } from '@/lib/mock';
import { exportToCSV } from '@/lib/exportUtils';
import { cronbachAlpha, pearsonCorrelation, linearRegression, mean } from '@/lib/stats';
import { emptyTemplate, academicTemplates } from '@/lib/templates';
import {
  Settings, Plus, Trash2, Save, Users, FileDown, Download, GripVertical,
  FileText, PlaySquare, ArrowLeft, QrCode, Palette, AlignLeft,
  CheckSquare, CircleDot, Info, Copy, Share, LayoutTemplate,
  FileSpreadsheet, PenTool, Wand2, X
} from 'lucide-react';
import { d1Request, deductCredits, generateFormWithAI, publishPublicFormSnapshot, getCookie } from '@/lib/api';

const THEME_COLORS = [
  { id: 'indigo', hex: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', hover: 'hover:bg-indigo-50', pale: 'bg-indigo-50/50' },
  { id: 'emerald', hex: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', hover: 'hover:bg-emerald-50', pale: 'bg-emerald-50/50' },
  { id: 'rose', hex: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', hover: 'hover:bg-rose-50', pale: 'bg-rose-50/50' },
  { id: 'amber', hex: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600', hover: 'hover:bg-amber-50', pale: 'bg-amber-50/50' },
  { id: 'slate', hex: 'bg-slate-800', text: 'text-slate-800', border: 'border-slate-800', hover: 'hover:bg-slate-100', pale: 'bg-slate-100/50' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking
  const [appMode, setAppMode] = useState<'dashboard' | 'editor'>('dashboard');
  const [projects, setProjects] = useState<{ template: FormTemplate, responses: FormResponse[] }[]>([]);

  const [activeTab, setActiveTab] = useState<'builder' | 'data' | 'analysis'>('builder');
  const [template, setTemplate] = useState<FormTemplate>(emptyTemplate);
  const [responses, setResponses] = useState<FormResponse[]>([]);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [analysisRun, setAnalysisRun] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'Tersimpan' | 'Menyimpan...' | 'Belum disimpan'>('Tersimpan');

  // AI Builder States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [aiIdentities, setAiIdentities] = useState(["Nama Lengkap", "Usia", "Jenis Kelamin"]);
  const [aiVariablesX, setAiVariablesX] = useState([{ name: "", indicators: "" }]);
  const [aiVariableY, setAiVariableY] = useState({ name: "", indicators: "" });
  const [aiTotalQuestions, setAiTotalQuestions] = useState(15);
  const [aiInstruction, setAiInstruction] = useState("");

  const theme = THEME_COLORS.find(c => c.id === template.themeColor) || THEME_COLORS[0];

  // Auth guard: redirect to app-main form-redirect (which handles Firebase token sync)
  useEffect(() => {
    const token = getCookie("skripzy_token");
    if (!token) {
      // Redirect ke form-redirect di app-main yang akan sync token lalu redirect kembali
      window.location.href = "https://app.skripzy.id/dashboard/tools/form-redirect";
      return;
    }
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (appMode === 'dashboard') {
      const loadMyForms = async () => {
        try {
          const [wsForms, wsResponses] = await Promise.all([
            d1Request("workspace_forms").catch(() => ({ data: [] })),
            d1Request("workspace_form_responses").catch(() => ({ data: [] }))
          ]);
          
          if (wsForms && wsForms.data) {
            const formatted = wsForms.data.map((f: any) => {
              try {
                const parsed = JSON.parse(f.content);
                parsed.id = parsed.id || f.id;
                parsed.title = parsed.title || f.title || "Untitled Form";
                
                // Map responses for this form
                const formResponses = (wsResponses.data || [])
                  .filter((r: any) => r.form_id === f.id)
                  .map((r: any) => {
                    try {
                      return {
                        id: r.id,
                        timestamp: r.created_at || new Date().toISOString(),
                        answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers,
                      };
                    } catch (e) { return null; }
                  }).filter(Boolean);
                  
                return { template: parsed, responses: formResponses };
              } catch (e) { return null; }
            }).filter(Boolean);
            setProjects(formatted);
          }
        } catch (e) {
          console.warn("Belum ada form atau gagal load:", e);
        }
      };
      loadMyForms();
    }
  }, [appMode]);

  useEffect(() => {
    if (appMode !== 'editor' || !template.id) return;
    setSaveStatus('Menyimpan...');
    const timer = setTimeout(async () => {
      try {
        await d1Request("workspaces", {
          method: "PATCH",
          id: template.id,
          body: { title: template.title || "Formulir Baru", description: template.description }
        });
        await d1Request("workspace_forms", {
          method: "PATCH",
          id: template.id,
          body: { content: JSON.stringify(template) }
        });
        setSaveStatus('Tersimpan');
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus('Belum disimpan');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [template, appMode]);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Memverifikasi akun...</p>
        </div>
      </div>
    );
  }

  const handleGenerateWithAI = async () => {
    if (!aiVariableY.name) return alert("Pilih minimal 1 variabel Y");
    if (!aiVariablesX[0].name) return alert("Pilih minimal 1 variabel X");

    setAiGenerating(true);
    try {
      // 1. Potong kredit (5)
      await deductCredits(5);

      const prompt = `Buatkan kuesioner akademik dalam format JSON murni.
Identitas Responden yang diminta: ${aiIdentities.join(", ")}.
Variabel X:
${aiVariablesX.filter(v => v.name).map((v, i) => `${i + 1}. ${v.name} (Indikator: ${v.indicators || 'Tentukan otomatis'})`).join('\n')}

Variabel Y:
${aiVariableY.name} (Indikator: ${aiVariableY.indicators || 'Tentukan otomatis'})

Total Pertanyaan Skala Likert (hanya untuk variabel, tidak termasuk identitas): Sekitar ${aiTotalQuestions}.
Instruksi tambahan: ${aiInstruction || 'Tidak ada'}

KEMBALIKAN OUTPUT PURE JSON DENGAN STRUKTUR INI SAJA, TANPA FORMATTING MARKDOWN, TANPA BACKTICKS:
{
  "title": "Judul Kuesioner (buatkan judul yang sesuai)",
  "description": "Deskripsi singkat mengenai tujuan penelitian",
  "themeColor": "indigo",
  "targetRespondents": 100,
  "sections": [
    {
      "id": "s_identity",
      "name": "Identitas Responden",
      "type": "identity",
      "items": [
        { "id": "q_id1", "text": "Nama Lengkap", "type": "text", "required": true },
        { "id": "q_id2", "text": "Jenis Kelamin", "type": "choice", "options": ["Laki-laki", "Perempuan"], "required": true }
      ]
    },
    {
      "id": "s_var_x1",
      "name": "Nama Variabel X1",
      "type": "variable",
      "items": [
        { "id": "q_x1", "text": "Pernyataan positif likert terkait indikator 1", "type": "likert", "scale": 5, "required": true }
      ]
    }
  ]
}`;

      const aiResponse = await generateFormWithAI(prompt);
      let cleanJson = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
      if (cleanJson.startsWith('`')) cleanJson = cleanJson.substring(1);
      if (cleanJson.endsWith('`')) cleanJson = cleanJson.slice(0, -1);

      const generatedTemplate = JSON.parse(cleanJson);
      generatedTemplate.id = `form_${Date.now()}`;

      // Simpan ke D1
      await d1Request("workspaces", {
        method: "POST",
        body: {
          id: generatedTemplate.id,
          title: generatedTemplate.title || "Formulir AI",
          type: "form-kuesioner",
          status: "Draft",
          topic: "Form Kuesioner",
          progress: 0
        }
      });
      await d1Request("workspace_forms", {
        method: "POST",
        body: {
          id: generatedTemplate.id,
          workspace_id: generatedTemplate.id,
          content: JSON.stringify(generatedTemplate)
        }
      });

      setTemplate(generatedTemplate);
      setResponses([]);
      setShowAiModal(false);
      setAppMode('editor');
      setActiveTab('builder');
      setAnalysisRun(false);

    } catch (error: any) {
      alert(error.message || "Gagal membuat form dengan AI. Pastikan kredit cukup dan API Groq aktif.");
    } finally {
      setAiGenerating(false);
    }
  };





  const createNewProject = async (baseData: FormTemplate) => {
    if (isCreatingProject) return;
    setIsCreatingProject(true);
    try {
      // 1. Potong kredit (kecuali jika mengedit)
      await deductCredits(5);

      const newDoc = JSON.parse(JSON.stringify(baseData));
      newDoc.id = `form_${Date.now()}`;

      // 2. Simpan ke D1
      await d1Request("workspaces", {
        method: "POST",
        body: {
          id: newDoc.id,
          title: newDoc.title || "Formulir Baru",
          type: "form-kuesioner",
          status: "Draft",
          topic: "Form Kuesioner",
          progress: 0
        }
      });
      await d1Request("workspace_forms", {
        method: "POST",
        body: {
          id: newDoc.id,
          workspace_id: newDoc.id,
          content: JSON.stringify(newDoc)
        }
      });

      setTemplate(newDoc);
      setResponses([]); // Explicitly empty responses for new template
      setAppMode('editor');
      setActiveTab('builder');
      setAnalysisRun(false);
    } catch (error: any) {
      alert(error.message || "Gagal membuat form. Pastikan Anda sudah login dan kredit cukup.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus kuesioner ini secara permanen? Data yang dihapus tidak dapat dikembalikan.")) return;

    try {
      await d1Request("workspaces", { method: "DELETE", id });
      await d1Request("workspace_forms", { method: "DELETE", id });
      setProjects(projects.filter(p => p.template.id !== id));
    } catch (err: any) {
      alert("Gagal menghapus kuesioner: " + err.message);
    }
  };

  const deleteResponse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus data responden ini? Tindakan ini tidak dapat dibatalkan.")) return;

    try {
      await d1Request("workspace_form_responses", { method: "DELETE", id });
      setResponses(responses.filter(r => r.id !== id));
    } catch (err: any) {
      alert("Gagal menghapus respons: " + err.message);
    }
  };

  const saveToProjects = async () => {
    setSaveStatus('Menyimpan...');
    try {
      await d1Request("workspaces", {
        method: "PATCH",
        id: template.id,
        body: { title: template.title || "Formulir Baru", description: template.description }
      });
      await d1Request("workspace_forms", {
        method: "PATCH",
        id: template.id,
        body: { content: JSON.stringify(template) }
      });
      setSaveStatus('Tersimpan');
    } catch (error: any) {
      console.error(error);
      alert("Gagal menyimpan project: " + error.message);
      setSaveStatus('Belum disimpan');
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const slug = `f${template.id.replace('form_', '')}`;
      await publishPublicFormSnapshot({
        formId: template.id,
        description: template.description,
        settings: {},
        sections: template.sections,
        publishedAt: new Date().toISOString()
      }, slug, "publish");

      setPublicSlug(slug);
      setShowPublishModal(true);
    } catch (e: any) {
      alert("Gagal mem-publish form: " + e.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const addSection = () => {
    const newSection: Section = {
      id: `s_${Date.now()}`,
      name: 'Variabel Baru',
      type: 'variable',
      items: [{ id: `q_${Date.now()}`, text: 'Pernyataan baru', type: 'likert', scale: 5 }]
    };
    setTemplate({ ...template, sections: [...template.sections, newSection] });
  };

  const updateSection = (sId: string, updates: Partial<Section>) => {
    setTemplate({
      ...template,
      sections: template.sections.map(s => s.id === sId ? { ...s, ...updates } : s)
    });
  };

  const removeSection = (sId: string) => {
    setTemplate({ ...template, sections: template.sections.filter(s => s.id !== sId) });
  };

  const addItem = (sId: string) => {
    setTemplate({
      ...template,
      sections: template.sections.map(s => {
        if (s.id === sId) {
          const type = s.type === 'variable' ? 'likert' : (s.type === 'info' ? 'info' : 'text');
          return {
            ...s,
            items: [...s.items, { id: `q_${Date.now()}`, text: 'Item baru', type: type as QuestionType }]
          };
        }
        return s;
      })
    });
  };

  const updateItem = (sId: string, qId: string, updates: Partial<Question>) => {
    setTemplate({
      ...template,
      sections: template.sections.map(s => {
        if (s.id === sId) {
          return { ...s, items: s.items.map(q => q.id === qId ? { ...q, ...updates } : q) };
        }
        return s;
      })
    });
  };

  const removeItem = (sId: string, qId: string) => {
    setTemplate({
      ...template,
      sections: template.sections.map(s => {
        if (s.id === sId) {
          return { ...s, items: s.items.filter(q => q.id !== qId) };
        }
        return s;
      })
    });
  };

  // Calculate Progress
  const progressRatio = responses.length / (template.targetRespondents || 1);
  const progressPct = Math.min(100, Math.round(progressRatio * 100));
  let progressColor = 'bg-red-500';
  if (progressPct >= 25 && progressPct < 50) progressColor = 'bg-amber-400';
  else if (progressPct >= 50 && progressPct < 75) progressColor = 'bg-blue-500';
  else if (progressPct >= 75) progressColor = 'bg-emerald-500';

  return (
    <>
      {appMode === 'dashboard' ? (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <a href="http://app.skripzy.id/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg hidden sm:flex items-center gap-2 text-sm font-semibold transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </a>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2 sm:gap-3">
                <img src="https://app.skripzy.id/logo-skripzy.webp" alt="Skripzy" className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-sm" />
                <h1 className="text-lg sm:text-2xl font-bold font-display text-slate-800 tracking-tight">Skripzy<span className="text-indigo-600">Form</span></h1>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700">
              <Info className="w-4 h-4 shrink-0" />
              <span>Pembuatan form: 5 Kredit</span>
            </div>
          </header>
          <main className="max-w-6xl mx-auto mt-6 sm:mt-10 px-4 sm:px-6">
            {projects.length > 0 && (
              <div className="mb-12">
                <h2 className="text-lg sm:text-2xl font-bold font-display text-slate-800 mb-4 sm:mb-6">Kuesioner Saya</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((proj, idx) => (
                    <div key={proj.template.id || idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition cursor-pointer" onClick={() => {
                      setTemplate(proj.template);
                      setResponses(proj.responses || []);
                      setAppMode('editor');
                      setActiveTab('builder');
                      setAnalysisRun(false);
                    }}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${THEME_COLORS.find(c => c.id === proj.template.themeColor)?.pale || 'bg-indigo-50'} ${THEME_COLORS.find(c => c.id === proj.template.themeColor)?.text || 'text-indigo-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 truncate">{proj.template.title || 'Untitled Form'}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{proj.template.sections?.length || 0} Bagian</p>
                        </div>
                        <button
                          onClick={(e) => deleteProject(proj.template.id, e)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition shrink-0"
                          title="Hapus Kuesioner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-slate-200 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold font-display text-slate-800">Mulai Penelitian Baru</h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Pilih template form untuk memulai atau buat dari awal.</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowAiModal(true)}
                  disabled={isCreatingProject}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:shadow-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Wand2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" /> AI Builder ✨
                </button>
                <button
                  onClick={() => createNewProject(emptyTemplate)}
                  disabled={isCreatingProject}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl hover:border-indigo-600 hover:text-indigo-600 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isCreatingProject ? <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
                  Buat Manual
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {academicTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col h-full overflow-hidden"
                >
                  {/* Visual Preview Header */}
                  <div className={`h-24 ${tpl.themeColor === 'emerald' ? 'bg-emerald-50' : tpl.themeColor === 'rose' ? 'bg-rose-50' : tpl.themeColor === 'amber' ? 'bg-amber-50' : 'bg-indigo-50'} border-b border-slate-100 flex items-center justify-center p-4 relative`}>
                    <div className="absolute top-3 left-4 flex gap-1 opacity-50">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div><div className="w-2 h-2 rounded-full bg-slate-300"></div><div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    </div>
                    <div className="w-3/4 h-12 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center px-4">
                      <div className="w-full h-2 bg-slate-100 rounded-full"></div>
                    </div>
                  </div>

                  {/* Info Text */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-slate-800 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6 flex-1 line-clamp-3">
                      {tpl.description}
                    </p>

                    <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                      <button
                        onClick={() => createNewProject(tpl)}
                        disabled={isCreatingProject}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 rounded-xl transition border border-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <PenTool className="w-3.5 h-3.5" /> Gunakan Form
                      </button>
                      {/* Just re-use the action logic for preview to dive directly into the editor for now */}
                      <button
                        onClick={() => createNewProject(tpl)}
                        disabled={isCreatingProject}
                        className="px-3 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl transition flex items-center justify-center group/btn disabled:opacity-50"
                        title="Preview Template"
                      >
                        <FileSpreadsheet className="w-4 h-4 group-hover/btn:text-indigo-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shrink-0 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => setAppMode('dashboard')} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4">
                <img src="https://app.skripzy.id/logo-skripzy.webp" alt="Skripzy" className="w-6 h-6 rounded-md shadow-sm" />
                <span className="font-bold text-sm tracking-tight truncate max-w-[200px]">{template.title || 'Untitled'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center gap-2 mr-2">
                <Palette className="w-4 h-4 text-slate-400" />
                <div className="flex gap-1">
                  {THEME_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setTemplate({ ...template, themeColor: c.id })}
                      className={`w-5 h-5 rounded-full ${c.hex} border-2 ${template.themeColor === c.id ? 'border-slate-800' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 mr-2">
                <span className={`text-xs font-semibold ${saveStatus === 'Tersimpan' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {saveStatus}
                </span>
              </div>

              <button onClick={saveToProjects} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hidden sm:flex items-center gap-2">
                <Save className="w-4 h-4" /> Simpan
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`px-4 py-1.5 ${theme.hex} text-white rounded-lg text-sm font-medium shadow-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50`}
              >
                {isPublishing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Share className="w-4 h-4" />}
                {isPublishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </header>

          <main className={`mx-auto mt-6 px-4 flex flex-col md:flex-row gap-6 items-start w-full transition-all duration-300 ${activeTab === 'data' ? 'max-w-[1400px]' : 'max-w-5xl'}`}>
            {/* Sidebar Tabs */}
            <aside className="w-full md:w-64 bg-white rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-sm shrink-0 sticky top-24">
              <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                <button
                  onClick={() => setActiveTab('builder')}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-2xl transition-colors whitespace-nowrap ${activeTab === 'builder' ? `${theme.pale} ${theme.text}` : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <FileText className="w-4 h-4" /> Builder Formulir
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-2xl transition-colors whitespace-nowrap ${activeTab === 'data' ? `${theme.pale} ${theme.text}` : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Users className="w-4 h-4" /> Data Responden
                  </div>
                  {responses.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'data' ? 'bg-white/50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      {responses.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-2xl transition-colors whitespace-nowrap ${activeTab === 'analysis' ? `${theme.pale} ${theme.text}` : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <PlaySquare className="w-4 h-4" /> Analisis Statistik
                </button>
              </div>
            </aside>

            {/* Dynamic Content */}
            <div className="flex-1 min-w-0 w-full relative">

              {activeTab === 'builder' && (
                <div className="space-y-6">
                  {/* Form Settings / Header */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 md:p-8 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-full h-2 ${theme.hex}`}></div>
                    <input
                      type="text"
                      value={template.title}
                      onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                      className="w-full text-xl sm:text-2xl md:text-3xl font-display font-bold text-slate-800 border-none outline-none focus:ring-0 placeholder-slate-400 bg-transparent transition-colors hover:bg-slate-50 focus:bg-white rounded-xl px-2 -mx-2"
                      placeholder="Judul Formulir"
                    />
                    <textarea
                      value={template.description}
                      onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                      className="w-full mt-3 text-xs sm:text-sm md:text-base text-slate-500 border-none outline-none focus:ring-0 resize-none placeholder-slate-400 bg-transparent transition-colors hover:bg-slate-50 focus:bg-white rounded-xl px-2 -mx-2 min-h-[60px]"
                      placeholder="Deskripsi formulir... (opsional)"
                      rows={2}
                    />
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Target Responden:</span>
                      <input
                        type="number"
                        min="1"
                        value={template.targetRespondents}
                        onChange={(e) => setTemplate({ ...template, targetRespondents: Number(e.target.value) })}
                        className="w-24 text-sm font-bold border border-slate-200 rounded-lg px-3 py-1 outline-none focus:border-indigo-400"
                      />
                      <span className="text-xs text-slate-400">orang</span>
                    </div>
                  </div>

                  {/* Sections Map */}
                  {template.sections.map((section, sIndex) => (
                    <div key={section.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 md:p-8 group relative">

                      {/* Section Drag Handle & Setup */}
                      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 mb-4 border-b border-slate-100 sticky top-[64px] bg-white z-10">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="hidden sm:flex text-slate-300 cursor-grab px-1"><GripVertical className="w-5 h-5" /></div>
                          <select
                            value={section.type}
                            onChange={(e) => updateSection(section.id, { type: e.target.value as SectionType })}
                            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 w-full sm:w-auto"
                          >
                            <option value="variable">Variabel Penelitian (X/Y)</option>
                            <option value="identity">Identitas Responden</option>
                            <option value="info">Informasi / Teks</option>
                          </select>
                        </div>

                        <div className="flex items-center flex-1 w-full sm:w-auto gap-3">
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => updateSection(section.id, { name: e.target.value })}
                            className="flex-1 text-sm sm:text-base md:text-lg font-bold text-slate-800 border-none outline-none px-1 placeholder-slate-300"
                            placeholder="Nama Bagian (ex: Demografi / Variabel X)"
                          />
                          <button onClick={() => removeSection(section.id)} className="text-slate-400 hover:text-red-500 p-2 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-4">
                        {section.items.map((item, qIndex) => (
                          <div key={item.id} className="flex gap-2 sm:gap-4 items-start bg-slate-50/50 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border border-slate-200 group/item transition-colors focus-within:bg-white focus-within:shadow-[0_0_0_2px_theme('colors.indigo.100')]">
                            <div className="mt-2 text-slate-300 cursor-grab hidden sm:block"><GripVertical className="w-4 h-4" /></div>

                            <div className="flex-1 flex flex-col gap-3 min-w-0">
                              {/* Item Question/Text Input */}
                              <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                  type="text"
                                  value={item.text}
                                  onChange={(e) => updateItem(section.id, item.id, { text: e.target.value })}
                                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-medium text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder-slate-400"
                                  placeholder={section.type === 'info' ? 'Judul Teks...' : 'Tulis pertanyaan...'}
                                />
                                {section.type !== 'info' && (
                                  <select
                                    value={item.type}
                                    onChange={(e) => updateItem(section.id, item.id, { type: e.target.value as QuestionType, options: ['Opsi 1'] })}
                                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 w-full sm:w-48"
                                  >
                                    <option value="text">Jawaban Singkat</option>
                                    <option value="choice">Pilihan Ganda</option>
                                    <option value="checkbox">Kotak Centang</option>
                                    {section.type === 'variable' && <option value="likert">Skala Likert (1-5)</option>}
                                  </select>
                                )}
                              </div>

                              {/* Item Sub-Properties Config */}
                              <div className="pl-1">
                                {item.type === 'info' && (
                                  <textarea
                                    value={item.description || ''}
                                    onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                                    className="w-full bg-transparent border-none text-sm text-slate-600 outline-none resize-none pt-2"
                                    placeholder="Tuliskan deskripsi informasi, tata cara, atau disclaimer panjang di sini..."
                                    rows={2}
                                  />
                                )}

                                {item.type === 'likert' && (
                                  <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Skala Rating:</span>
                                      <select
                                        className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 w-full sm:w-auto max-w-full"
                                        value={item.scale || 5}
                                        onChange={(e) => updateItem(section.id, item.id, { scale: Number(e.target.value) })}
                                      >
                                        <option value="4">1 - 4 (Sangat Tidak Setuju - Sangat Setuju)</option>
                                        <option value="5">1 - 5 (Sangat Tidak Setuju - Netral - Sangat Setuju)</option>
                                        <option value="7">1 - 7 (Diperluas)</option>
                                      </select>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-indigo-50/50 px-3 py-2 rounded-lg w-full border border-indigo-100">
                                      <CircleDot className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                      <span>Akan ditampilkan sebagai pilihan tombol skala 1 hingga {item.scale || 5} kepada responden.</span>
                                    </div>
                                  </div>
                                )}

                                {item.type === 'text' && (
                                  <div className="border-b-2 border-dashed border-slate-300 w-2/3 h-8 opacity-50"></div>
                                )}

                                {(item.type === 'choice' || item.type === 'checkbox') && (
                                  <div className="space-y-2 mt-1">
                                    {(item.options || []).map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-center gap-2">
                                        {item.type === 'choice' ? <CircleDot className="w-4 h-4 text-slate-300" /> : <CheckSquare className="w-4 h-4 text-slate-300" />}
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...(item.options || [])];
                                            newOpts[oIdx] = e.target.value;
                                            updateItem(section.id, item.id, { options: newOpts });
                                          }}
                                          placeholder={`Opsi ${oIdx + 1}`}
                                          className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 text-sm text-slate-700 outline-none px-1 py-1"
                                        />
                                        <button onClick={() => {
                                          const newOpts = [...(item.options || [])];
                                          newOpts.splice(oIdx, 1);
                                          updateItem(section.id, item.id, { options: newOpts });
                                        }} className="text-slate-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                    ))}
                                    <button onClick={() => {
                                      updateItem(section.id, item.id, { options: [...(item.options || []), `Opsi ${(item.options?.length || 0) + 1}`] });
                                    }} className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline mt-2">
                                      <Plus className="w-3 h-3" /> Tambah Opsi
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Delete Item */}
                            <button onClick={() => removeItem(section.id, item.id)} className="text-slate-400 hover:text-red-500 px-2 shrink-0 self-center">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => addItem(section.id)}
                        className="mt-4 flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50 hover:border-slate-200 px-4 py-2 rounded-xl transition-all"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Pertanyaan/Item
                      </button>
                    </div>
                  ))}

                  <div className="flex justify-center mt-6">
                    <button
                      onClick={addSection}
                      className="flex items-center px-6 py-4 bg-white border border-dashed border-slate-300 rounded-3xl text-slate-600 text-sm font-medium hover:border-slate-400 hover:shadow-sm transition-all w-full md:w-2/3 justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Tambah Bagian Form Baru
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start justify-between">
                    <div>
                      <h2 className="font-bold text-slate-800 text-sm sm:text-lg">Respons Masuk</h2>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Daftar semua respons responden.</p>
                    </div>

                    {/* Custom target progress UI element at top right */}
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl w-full sm:w-auto">
                      <div className="flex flex-col basis-1/2 sm:w-32">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                          <span>Progres</span>
                          <span className="text-slate-700">{responses.length} / {template.targetRespondents || 100}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${progressPct}%` }}></div>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-slate-200 mx-1"></div>
                      <button
                        onClick={() => exportToCSV(template, responses, 'data_responden.csv')}
                        className="flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm shrink-0 transition"
                      >
                        <FileDown className="w-3.5 h-3.5 mr-1.5" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 bg-slate-50">
                        <tr className="h-10">
                          <th className="px-4 whitespace-nowrap bg-slate-50 sticky left-0 z-10 w-24">ID</th>
                          <th className="px-4 whitespace-nowrap">Waktu</th>
                          {template.sections.filter(s => s.type !== 'info').flatMap(v =>
                            v.items.map((item, i) => (
                              <th key={item.id} className="px-4 max-w-[150px] truncate" title={`${v.name} - ${item.text}`}>
                                {v.type === 'variable' ? `${v.name.split(' ')[0]}_${i + 1}` : item.text}
                              </th>
                            ))
                          )}
                          <th className="px-4 whitespace-nowrap bg-slate-50 sticky right-0 z-10 text-center w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        {responses.length === 0 ? (
                          <tr><td colSpan={100} className="text-center py-10 text-slate-400 text-sm">Belum ada respons.</td></tr>
                        ) : (
                          responses.map((res) => (
                            <tr key={res.id} className="h-12 hover:bg-slate-50 transition-colors">
                              <td className="px-4 font-mono text-[10px] md:text-xs font-semibold bg-white sticky left-0 z-10 border-r border-slate-50">{res.id.split('_')[1] ? `R#${res.id.split('_')[1]}` : res.id.slice(0, 8)}</td>
                              <td className="px-4 whitespace-nowrap text-slate-500 text-[10px] md:text-xs">{new Date(res.timestamp || Date.now()).toLocaleDateString()}</td>
                              {template.sections.filter(s => s.type !== 'info').flatMap(v =>
                                v.items.map(item => {
                                  const val = res.answers[item.id];
                                  const displayVal = Array.isArray(val) ? val.join(', ') : val;
                                  return (
                                    <td key={item.id} className={`px-4 truncate max-w-[150px] ${v.type === 'variable' ? 'text-center bg-indigo-50/20 font-mono text-[10px] md:text-xs' : 'text-[10px] md:text-xs'}`}>
                                      {displayVal || '-'}
                                    </td>
                                  )
                                })
                              )}
                              <td className="px-4 bg-white sticky right-0 z-10 border-l border-slate-50 text-center">
                                <button
                                  onClick={(e) => deleteResponse(res.id, e)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                  title="Hapus Respons"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  {!analysisRun ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center shadow-sm min-h-[400px]">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 mb-6">
                        <PlaySquare className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl font-bold font-display text-slate-800 mb-2">Analisis Statistik Siap Dijalankan</h2>
                      <p className="text-sm text-slate-500 max-w-sm mb-8">
                        Uji reliabilitas (Cronbach&apos;s Alpha), validitas item (Pearson), dan Regresi Linier otomatis dari data Variabel Penelitian.
                      </p>
                      <button
                        onClick={() => setAnalysisRun(true)}
                        disabled={responses.length === 0}
                        className={`px-8 py-3 ${theme.hex} text-white font-bold text-sm rounded-xl hover:opacity-90 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {responses.length === 0 ? 'Data Belum Tersedia' : 'Jalankan Analisis Sekarang'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-24 z-10">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-green-500" /> Analisis Selesai</span>
                        <button onClick={() => setAnalysisRun(false)} className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200">Re-Uji Data</button>
                      </div>
                      <AnalysisResults template={template} responses={responses} theme={theme} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Form Diterbitkan</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-700">&times;</button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center bg-slate-50 text-center">
              <div className="w-40 h-40 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://forms.skripzy.id/f?id=${publicSlug}`)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Pindai QR Code atau bagikan link</p>
              <div className="flex items-center w-full gap-2">
                <input
                  readOnly
                  value={`https://forms.skripzy.id/f?id=${publicSlug}`}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 outline-none"
                />
                <button onClick={() => navigator.clipboard.writeText(`https://forms.skripzy.id/f?id=${publicSlug}`)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Copy Link">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-white flex justify-center">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl w-full">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Builder Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 font-display flex items-center gap-2">
                  <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  AI Form Builder
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Buat kuesioner otomatis dengan struktur yang rapi (5 Kredit)</p>
              </div>
              <button onClick={() => !aiGenerating && setShowAiModal(false)} className="p-2 hover:bg-white rounded-full transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Identitas */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Pilihan Identitas Responden</label>
                <div className="flex flex-wrap gap-2">
                  {["Nama Lengkap", "Usia", "Jenis Kelamin", "Instansi/Pekerjaan", "Email", "No. HP"].map(idName => (
                    <label key={idName} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-indigo-50 transition text-sm">
                      <input
                        type="checkbox"
                        checked={aiIdentities.includes(idName)}
                        onChange={(e) => {
                          if (e.target.checked) setAiIdentities([...aiIdentities, idName]);
                          else setAiIdentities(aiIdentities.filter(i => i !== idName));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      {idName}
                    </label>
                  ))}
                </div>
              </div>

              {/* Variabel X */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-slate-700">Variabel Independen (X)</label>
                  <button
                    onClick={() => setAiVariablesX([...aiVariablesX, { name: "", indicators: "" }])}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambah Var X
                  </button>
                </div>
                <div className="space-y-4">
                  {aiVariablesX.map((vx, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder={`Nama Variabel X${idx + 1} (contoh: Kualitas Layanan)`}
                        value={vx.name}
                        onChange={e => {
                          const newVx = [...aiVariablesX];
                          newVx[idx].name = e.target.value;
                          setAiVariablesX(newVx);
                        }}
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 mb-2"
                      />
                      {vx.name && (
                        <textarea
                          placeholder={`Indikator untuk ${vx.name} (pisahkan dengan koma atau enter. Kosongkan jika ingin AI yang menentukan)`}
                          value={vx.indicators}
                          onChange={e => {
                            const newVx = [...aiVariablesX];
                            newVx[idx].indicators = e.target.value;
                            setAiVariablesX(newVx);
                          }}
                          className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 h-20 text-slate-600"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Variabel Y */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Variabel Dependen (Y)</label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Nama Variabel Y (contoh: Kepuasan Pelanggan)"
                    value={aiVariableY.name}
                    onChange={e => setAiVariableY({ ...aiVariableY, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 mb-2"
                  />
                  {aiVariableY.name && (
                    <textarea
                      placeholder={`Indikator untuk ${aiVariableY.name} (Opsional, kosongkan jika AI)`}
                      value={aiVariableY.indicators}
                      onChange={e => setAiVariableY({ ...aiVariableY, indicators: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 h-20 text-slate-600"
                    />
                  )}
                </div>
              </div>

              {/* Konfigurasi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Total Pertanyaan (Estimasi)</label>
                  <input
                    type="number"
                    value={aiTotalQuestions}
                    onChange={e => setAiTotalQuestions(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Instruksi Khusus (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Misal: Gunakan bahasa santai"
                    value={aiInstruction}
                    onChange={e => setAiInstruction(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAiModal(false)}
                disabled={aiGenerating}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleGenerateWithAI}
                disabled={aiGenerating || !aiVariableY.name || !aiVariablesX[0].name}
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI Bekerja...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Form
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AnalysisResults({ template, responses, theme }: { template: FormTemplate, responses: FormResponse[], theme: any }) {
  const variableSections = template.sections.filter(s => s.type === 'variable');

  if (variableSections.length === 0) {
    return <div className="p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">Tidak ada bagian tipe &quot;Variabel&quot; untuk diuji.</div>;
  }

  return (
    <>
      {/* Reliability & Validity */}
      <div className="space-y-6">
        <h2 className="text-xl font-display font-bold text-slate-900 border-b border-slate-200 pb-2">Uji Instrumen (Per Variabel)</h2>
        {variableSections.map(variable => {
          const itemScores = variable.items.map(item => responses.map(r => Number(r.answers[item.id]) || 0));
          if (itemScores.length < 2) return (
            <div key={variable.id} className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="font-semibold text-lg text-slate-800 mb-2">{variable.name}</h3>
              <p className="text-sm text-slate-500">Butuh minimal 2 item bertipe likert.</p>
            </div>
          );

          const alpha = cronbachAlpha(itemScores);
          const isReliable = alpha >= 0.6;

          const totalScores = responses.map(r => variable.items.reduce((sum, item) => sum + (Number(r.answers[item.id]) || 0), 0));

          return (
            <div key={variable.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">{variable.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Cronbach&apos;s Alpha:</span>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${isReliable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {alpha.toFixed(3)} {isReliable ? '(Reliable)' : '(Not Reliable)'}
                  </span>
                </div>
              </div>
              <div className="p-2 sm:p-6 overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                    <tr className="h-10">
                      <th className="px-4 whitespace-nowrap">Item</th>
                      <th className="px-4 whitespace-nowrap">R-Hitung (Pearson)</th>
                      <th className="px-4 text-center">Validitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {variable.items.map((item, idx) => {
                      const scores = itemScores[idx];
                      const rCalc = pearsonCorrelation(scores, totalScores);
                      const rTable = 0.3; // threshold approx
                      const isValid = rCalc >= rTable;
                      return (
                        <tr key={item.id} className="h-12 hover:bg-slate-50 transition-colors">
                          <td className="px-4 font-medium max-w-[200px] truncate" title={item.text}>{item.text}</td>
                          <td className="px-4 font-mono font-medium text-slate-600">{rCalc.toFixed(3)}</td>
                          <td className="px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isValid ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                              {isValid ? 'Valid' : 'Gugur'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regression Demo */}
      {variableSections.length >= 2 && (
        <div className="space-y-6 pt-6 border-t border-slate-200">
          <h2 className="text-xl font-display font-bold text-slate-900 border-b border-slate-200 pb-2">Analisis Regresi Linier Sederhana</h2>
          <div className="bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="font-bold text-slate-800">Impact Analysis / Regresi</h2>
                <p className="text-xs text-slate-500">Dependent Variable: {variableSections[1].name}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-sm"
              >
                Cetak Hasil
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const varX = variableSections[0];
                const varY = variableSections[1];
                const xScores = responses.map(r => mean(varX.items.map(item => Number(r.answers[item.id]) || 0)));
                const yScores = responses.map(r => mean(varY.items.map(item => Number(r.answers[item.id]) || 0)));
                const reg = linearRegression(xScores, yScores);

                return (
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-4 text-[10px] uppercase tracking-wider">Persamaan Regresi</h4>
                      <div className={`${theme.pale} p-8 rounded-2xl border border-slate-100/50 flex flex-col items-center justify-center text-center gap-2 h-32`}>
                        <span className={`font-display font-bold text-3xl ${theme.text}`}>
                          Y = {reg.alpha.toFixed(3)} {reg.beta >= 0 ? '+' : ''} {reg.beta.toFixed(3)}X
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 mb-2 text-[10px] uppercase tracking-wider">Koefisien Model</h4>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 font-medium text-sm">Koefisien Korelasi (r)</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{reg.r.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 font-medium text-sm">R-Square (R²)</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {reg.rSquared.toFixed(3)} ({(reg.rSquared * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        Artinya, variabel <strong className="text-slate-700">{varX.name}</strong> menjelaskan secara terpisah <strong className="text-slate-700">{(reg.rSquared * 100).toFixed(1)}%</strong> variasi pengaruh pada <strong className="text-slate-700">{varY.name}</strong>.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
