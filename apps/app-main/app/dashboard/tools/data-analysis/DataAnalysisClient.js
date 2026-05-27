"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { d1Request } from "@/lib/d1Client";
import { WorkspaceModal } from "@/components/workspace/WorkspaceModal";
import {
    LayoutGrid,
    Table as TableIcon,
    Plus,
    FileText,
    Mic,
    Eye,
    BookOpen,
    Loader2,
    Settings,
    ChevronRight
} from "lucide-react";
import Link from "next/link";

const ANALYSIS_TYPES = [
    {
        id: "kuesioner",
        title: "Kuesioner / Angket",
        icon: FileText,
        description: "Uji Validitas, Reliabilitas, dan Analisis Deskriptif",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        href: "#projects",
    },
    {
        id: "literatur",
        title: "Literatur Review",
        icon: BookOpen,
        description: "Sintesis referensi menggunakan Notebook",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        href: "/dashboard/tools/notebook",
    },
];

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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Analysis</h1>
                    <p className="text-muted-foreground mt-1">
                        Kumpulkan data kuesioner kuantitatif, lakukan uji statistik, dan temukan insight untuk penelitian Anda.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                {ANALYSIS_TYPES.map((type) => (
                    <Link key={type.id} href={type.href} className="no-underline">
                        <div className="glass-panel p-6 hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between" style={{ border: "1px solid var(--border)", borderRadius: "16px", backgroundColor: "var(--surface)" }}>
                            <div>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${type.bg}`}>
                                    <type.icon className={`w-5 h-5 ${type.color}`} />
                                </div>
                                <h3 className="text-lg font-semibold text-card-foreground mb-2">{type.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {type.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div id="projects" className="space-y-4 pt-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                        Projek Terbaru
                    </h2>
                    <button 
                        onClick={() => setShowCreateModal(true)} 
                        className="btn btn-outline text-sm py-1.5 px-3 flex items-center" 
                        style={{ borderRadius: "8px" }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Projek Baru
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="glass-panel p-8 text-center flex flex-col items-center justify-center border-dashed" style={{ border: "1px dashed var(--border)", borderRadius: "16px", backgroundColor: "var(--surface)" }}>
                        <TableIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">Belum ada projek</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                            Buat kuesioner baru atau impor data untuk memulai analisis statistik.
                        </p>
                        <button 
                            onClick={() => setShowCreateModal(true)} 
                            className="btn btn-primary flex items-center" 
                            style={{ padding: "0.5rem 1.25rem", borderRadius: "8px" }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Projek
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => (
                            <div key={project.id} className="glass-panel group p-6 flex flex-col justify-between" style={{ border: "1px solid var(--border)", borderRadius: "16px", backgroundColor: "var(--surface)" }}>
                                <div>
                                    <div className="flex items-start justify-between">
                                        <h3 className="text-base font-medium line-clamp-2 text-card-foreground">
                                            {project.title}
                                        </h3>
                                        <button className="btn btn-ghost h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                            <Settings className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Diperbarui {new Date(project.updatedAt).toLocaleDateString("id-ID")}
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground shadow-sm capitalize">
                                            {project.type}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {project.responseCount} Responden
                                        </span>
                                    </div>
                                    <Link 
                                        href={`/dashboard/tools/data-analysis/kuesioner?id=${project.id}`}
                                        className="btn btn-outline w-full mt-4 flex items-center justify-center gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                        style={{ padding: "0.5rem 1rem", borderRadius: "8px", textDecoration: "none" }}
                                    >
                                        Buka Analisis
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        ))}
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
