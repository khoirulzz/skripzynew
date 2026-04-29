"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fetchPublicFormBySlug, submitPublicFormResponse } from "@/lib/workspacePublicApi";
import { FormRenderer } from "@/components/workspace/FormRenderer";
import { flattenFormQuestions, getQuestionLabelMap, isQuestionVisible } from "@/lib/workspaceDefaults";

export default function PublicFormPageClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const slug = useMemo(() => {
    const pathSegments = (pathname || "").split("/").filter(Boolean);
    if (pathSegments[0] === "form" && pathSegments[1] && pathSegments[1] !== "view") {
      return pathSegments[1];
    }
    return searchParams.get("slug") || "";
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!slug) return undefined;

    let isMounted = true;

    async function loadForm() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicFormBySlug(slug);
        if (isMounted) {
          setForm(response.form || null);
        }
      } catch (loadError) {
        console.error("Gagal memuat form publik:", loadError);
        if (isMounted) {
          setError(loadError.message || "Form publik tidak dapat dimuat.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadForm();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const questionMap = useMemo(() => getQuestionLabelMap(form), [form]);

  const requiredVisibleQuestions = useMemo(
    () =>
      flattenFormQuestions(form)
        .filter((question) => question.required)
        .filter((question) => isQuestionVisible(question, answers)),
    [answers, form]
  );

  const buildLabeledAnswers = () =>
    Object.entries(answers).reduce((acc, [questionId, value]) => {
      const question = questionMap[questionId];
      if (!question) return acc;
      acc[questionId] = {
        label: question.label,
        variableKey: question.variableKey,
        type: question.type,
        value,
      };
      return acc;
    }, {});

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form || !slug) return;

    const missingQuestion = requiredVisibleQuestions.find((question) => {
      const value = answers[question.id];
      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || value === "";
    });

    if (missingQuestion) {
      setError(`Mohon lengkapi pertanyaan wajib: ${missingQuestion.label}`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitPublicFormResponse(slug, {
        answers,
        answersLabeled: buildLabeledAnswers(),
        locale: typeof navigator !== "undefined" ? navigator.language : "id-ID",
      });
      setSubmitted(true);
    } catch (submitError) {
      console.error("Gagal mengirim form:", submitError);
      setError(submitError.message || "Gagal mengirim tanggapan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="animate-pulse" style={{ fontSize: "1rem", color: "var(--text-muted)" }}>Memuat formulir publik...</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
        <div className="glass-panel" style={{ maxWidth: "520px", width: "100%", padding: "2rem", textAlign: "center", borderTop: "4px solid var(--primary)" }}>
          <div style={{ width: "62px", height: "62px", borderRadius: "999px", backgroundColor: "rgba(16,185,129,0.12)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>✓</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Terima kasih</h1>
          <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.92rem" }}>
            {form?.settings?.thankYouMessage || "Jawaban Anda telah berhasil direkam."}
          </p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
        <div className="glass-panel" style={{ maxWidth: "520px", width: "100%", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.35rem", margin: 0 }}>Formulir Tidak Ditemukan</h1>
          <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.9rem" }}>
            Link publik ini tidak aktif atau sudah tidak tersedia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6" style={{ backgroundColor: "var(--background)", backgroundImage: "radial-gradient(circle at top right, rgba(79, 70, 229, 0.07), transparent 440px)" }}>
      <form onSubmit={handleSubmit} style={{ maxWidth: "820px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error ? (
          <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", color: "var(--danger)", fontSize: "0.86rem" }}>
            {error}
          </div>
        ) : null}

        <FormRenderer
          form={form}
          answers={answers}
          onAnswerChange={(question, value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
          device="desktop"
        />

        <div className="glass-panel" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Field bertanda <span style={{ color: "var(--danger)", fontWeight: 700 }}>*</span> wajib diisi.
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Mengirim..." : "Kirim Tanggapan"}
          </button>
        </div>
      </form>
    </div>
  );
}
