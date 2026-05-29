"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { d1Request } from "@/lib/d1Client";
import { WorkspaceModal } from "@/components/workspace/WorkspaceModal";
import {
    LayoutGrid,
    Table as TableIcon,
    Plus,
    Loader2,
    ChevronRight,
    Clock,
    Users,
    BarChart3,
} from "lucide-react";
import Link from "next/link";

export default function DataAnalysisClient() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchProjects = async () => {
            try {
                const resp = await d1Request("workspaces");
                if (resp.data) {
                    const filtered = resp.data.filter(w => w.type === "data-analysis");
                    setProjects(filtered);
                }
            } catch (err) {
                console.error("Gagal memuat projek data analysis:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [user, refreshKey]);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
            {/* Page Header */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.9rem", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                    Kuesioner &amp; Analisis Data
                </h1>
                <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    Kelola kuesioner kuantitatif, pantau kemajuan pengisian responden, dan lakukan uji statistik secara instan.
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <LayoutGrid style={{ width: "17px", height: "17px", color: "var(--primary)" }} />
                        Projek Kuesioner Anda
                    </h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}
                    >
                        <Plus style={{ width: "15px", height: "15px" }} />
                        Tambah Kuesioner Baru
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                        <Loader2 style={{ width: "28px", height: "28px", color: "var(--text-muted)" }} className="animate-spin" />
                    </div>
                ) : projects.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "240px", border: "1.5px dashed var(--border)", borderRadius: "16px", backgroundColor: "var(--surface)", textAlign: "center", padding: "2.5rem 1.5rem", gap: "0.75rem" }}>
                        <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <BarChart3 style={{ width: "26px", height: "26px", color: "var(--primary)", opacity: 0.7 }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>Belum ada projek kuesioner</h3>
                            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "320px" }}>
                                Buat kuesioner baru untuk mengumpulkan respon dan melakukan analisis statistik.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--primary)", color: "white", border: "none", cursor: "pointer", marginTop: "0.25rem" }}
                        >
                            <Plus style={{ width: "15px", height: "15px" }} />
                            Buat Kuesioner Baru
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                        {projects.map((project) => {
                            const targetRespondents = parseInt(project.topic) || 100;
                            const responseCount = project.responseCount || 0;
                            const progressPercent = Math.min(100, Math.round((responseCount / targetRespondents) * 100));
                            const updatedTime = project.updated_at || project.updatedAt;
                            const isPublished = project.status === "published";
                            const isDone = progressPercent >= 100;

                            return (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    targetRespondents={targetRespondents}
                                    responseCount={responseCount}
                                    progressPercent={progressPercent}
                                    updatedTime={updatedTime}
                                    isPublished={isPublished}
                                    isDone={isDone}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <WorkspaceModal
                    type="data-analysis"
                    onClose={() => {
                        setShowCreateModal(false);
                        setRefreshKey(prev => prev + 1);
                    }}
                />
            )}
        </div>
    );
}

function ProjectCard({ project, targetRespondents, responseCount, progressPercent, updatedTime, isPublished, isDone }) {
    const [hovered, setHovered] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--surface)",
                border: `1px solid ${hovered ? "var(--primary)" : "var(--border)"}`,
                borderRadius: "14px",
                overflow: "hidden",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.08)" : "none",
            }}
        >
            {/* Gradient accent bar */}
            <div style={{
                height: "3px",
                background: isDone
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, var(--primary), #818cf8)",
                width: "100%",
                flexShrink: 0,
            }} />

            <div style={{ padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.8rem", flex: 1 }}>

                {/* Title + Badge */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        color: hovered ? "var(--primary)" : "var(--text-main)",
                        lineHeight: 1.4,
                        flex: 1,
                        transition: "color 0.2s",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}>
                        {project.title}
                    </h3>
                    {isPublished ? (
                        <span style={{
                            fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.5rem",
                            borderRadius: "999px", backgroundColor: "rgba(16,185,129,0.12)",
                            color: "#10b981", whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.02em",
                        }}>
                            ● Live
                        </span>
                    ) : (
                        <span style={{
                            fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.5rem",
                            borderRadius: "999px", backgroundColor: "rgba(245,158,11,0.12)",
                            color: "#d97706", whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.02em",
                        }}>
                            Draft
                        </span>
                    )}
                </div>

                {/* Updated date */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)", fontSize: "0.74rem" }}>
                    <Clock style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                    {updatedTime
                        ? new Date(updatedTime).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                        : "Baru saja"}
                </div>

                {/* Divider */}
                <div style={{ height: "1px", backgroundColor: "var(--border)" }} />

                {/* Progress */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                            <Users style={{ width: "11px", height: "11px" }} />
                            Responden
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isDone ? "#10b981" : "var(--text-main)" }}>
                            {responseCount}
                            <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> / {targetRespondents}</span>
                            {isDone && " 🎉"}
                        </span>
                    </div>
                    <div style={{ width: "100%", height: "5px", borderRadius: "999px", backgroundColor: "var(--border)", overflow: "hidden" }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: "100%",
                            borderRadius: "999px",
                            background: isDone
                                ? "linear-gradient(90deg, #10b981, #34d399)"
                                : "linear-gradient(90deg, var(--primary), #818cf8)",
                            transition: "width 0.4s ease",
                        }} />
                    </div>
                </div>

                {/* CTA Button */}
                <Link
                    href={`/dashboard/tools/data-analysis/kuesioner?id=${project.id}`}
                    onMouseEnter={() => setBtnHovered(true)}
                    onMouseLeave={() => setBtnHovered(false)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        backgroundColor: btnHovered ? "var(--primary)" : "var(--background)",
                        border: `1px solid ${btnHovered ? "var(--primary)" : "var(--border)"}`,
                        color: btnHovered ? "white" : "var(--text-main)",
                        textDecoration: "none",
                        marginTop: "auto",
                        transition: "background 0.15s, color 0.15s, border-color 0.15s",
                    }}
                >
                    <BarChart3 style={{ width: "13px", height: "13px" }} />
                    Buka Analisis
                    <ChevronRight style={{ width: "13px", height: "13px" }} />
                </Link>
            </div>
        </div>
    );
}
