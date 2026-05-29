'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchPublicFormBySlug, submitPublicFormResponse } from '@/lib/api';
import { FormTemplate } from '@/lib/types';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const THEME_COLORS = [
  { id: 'indigo', hex: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', hover: 'hover:bg-indigo-50', pale: 'bg-indigo-50/50' },
  { id: 'emerald', hex: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', hover: 'hover:bg-emerald-50', pale: 'bg-emerald-50/50' },
  { id: 'rose', hex: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', hover: 'hover:bg-rose-50', pale: 'bg-rose-50/50' },
  { id: 'amber', hex: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600', hover: 'hover:bg-amber-50', pale: 'bg-amber-50/50' },
  { id: 'slate', hex: 'bg-slate-800', text: 'text-slate-800', border: 'border-slate-800', hover: 'hover:bg-slate-100', pale: 'bg-slate-100/50' },
];

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchPublicFormBySlug(slug)
      .then((res) => {
        setForm(res.form);
      })
      .catch((err) => {
        setError(err.message || 'Formulir tidak ditemukan');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Memuat kuesioner...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Formulir Tidak Tersedia</h1>
          <p className="text-slate-500">{error || 'Link ini mungkin sudah kadaluarsa atau tidak aktif.'}</p>
        </div>
      </div>
    );
  }

  const theme = THEME_COLORS.find(t => t.id === form.themeColor) || THEME_COLORS[0];

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2 font-display">Terima Kasih!</h1>
          <p className="text-slate-500">
            {form.settings?.thankYouMessage || 'Jawaban Anda telah berhasil dikirim dan dicatat oleh sistem.'}
          </p>
        </div>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Validasi sederhana: cek wajib
    for (const section of form.sections) {
      for (const item of section.items) {
        if (item.required && (!answers[item.id] || answers[item.id] === '')) {
          alert(`Mohon isi pertanyaan: ${item.text}`);
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      await submitPublicFormResponse(slug, {
        answers,
        locale: navigator.language
      });
      setSubmitted(true);
    } catch (err: any) {
      alert("Gagal mengirim tanggapan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 md:py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className={`bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-full h-3 ${theme.hex}`}></div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-800 mb-3">{form.title}</h1>
          {form.description && (
            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {form.sections.map((section: any) => (
            <div key={section.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6">{section.name}</h2>
              <div className="space-y-8">
                {section.items.map((item: any) => (
                  <div key={item.id} className="group">
                    {item.type === 'info' ? (
                      <div className="prose prose-slate max-w-none">
                        <h3 className="text-lg font-bold text-slate-800">{item.text}</h3>
                        {item.description && <p className="text-slate-600 whitespace-pre-wrap mt-2">{item.description}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-slate-800 font-medium mb-3 text-sm md:text-base">
                          {item.text}
                          {item.required && <span className="text-rose-500 ml-1">*</span>}
                        </label>
                        
                        {item.type === 'text' && (
                          <input
                            type="text"
                            required={item.required}
                            value={answers[item.id] as string || ''}
                            onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            placeholder="Jawaban Anda"
                          />
                        )}

                        {item.type === 'choice' && (
                          <div className="space-y-2">
                            {(item.options || []).map((opt: string, i: number) => (
                              <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                                <input
                                  type="radio"
                                  name={`q_${item.id}`}
                                  value={opt}
                                  required={item.required}
                                  checked={answers[item.id] === opt}
                                  onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                />
                                <span className="text-slate-700">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {item.type === 'checkbox' && (
                          <div className="space-y-2">
                            {(item.options || []).map((opt: string, i: number) => {
                              const selected = (answers[item.id] as string[]) || [];
                              return (
                                <label key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition">
                                  <input
                                    type="checkbox"
                                    value={opt}
                                    checked={selected.includes(opt)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleAnswerChange(item.id, [...selected, opt]);
                                      } else {
                                        handleAnswerChange(item.id, selected.filter(s => s !== opt));
                                      }
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                  />
                                  <span className="text-slate-700">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {item.type === 'likert' && (
                          <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
                            {Array.from({ length: item.scale || 5 }, (_, i) => i + 1).map((val) => (
                              <label key={val} className="cursor-pointer">
                                <input
                                  type="radio"
                                  name={`q_${item.id}`}
                                  value={val}
                                  required={item.required}
                                  checked={answers[item.id] === String(val)}
                                  onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                                  className="peer sr-only"
                                />
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 font-bold peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white hover:border-indigo-300 transition-all shadow-sm`}>
                                  {val}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
             <p className="text-xs text-slate-500 font-medium">Pastikan semua field wajib (*) telah diisi.</p>
             <button
               type="submit"
               disabled={submitting}
               className={`px-8 py-3 ${theme.hex} text-white font-bold rounded-xl hover:opacity-90 transition shadow-sm disabled:opacity-50 flex items-center gap-2`}
             >
               {submitting ? (
                 <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
               ) : (
                 'Kirim Tanggapan'
               )}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
