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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-card-foreground">Kuesioner &amp; Analisis Data</h1>
          <p className="text-muted-foreground mt-1">
            Kelola kuesioner kuantitatif, pantau kemajuan pengisian responden, dan lakukan uji statistik secara instan.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-card-foreground">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Projek Kuesioner Anda
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Kartu Tambah Baru */}
            <div 
              onClick={() => setShowCreateModal(true)} 
              className="glass-panel group p-6 flex flex-col items-center justify-center border-dashed hover:border-primary/50 transition-all duration-300 cursor-pointer text-center min-h-[220px]" 
              style={{ border: "2px dashed var(--border)", borderRadius: "16px", backgroundColor: "var(--surface)" }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">Tambah Kuesioner Baru</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-[220px]">
                Buat instrumen kuesioner baru dan tentukan target responden Anda.
              </p>
            </div>

            {/* Kartu Projek Aktif */}
            {projects.map((project) => {
              const targetRespondents = parseInt(project.topic) || 100;
              const responseCount = project.responseCount || 0;
              const progressPercent = Math.min(100, Math.round((responseCount / targetRespondents) * 100));

              return (
                <div 
                  key={project.id} 
                  className="glass-panel group p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300" 
                  style={{ border: "1px solid var(--border)", borderRadius: "16px", backgroundColor: "var(--surface)" }}
                >
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold line-clamp-2 text-card-foreground group-hover:text-primary transition-colors duration-300">
                      {project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      Diperbarui {new Date(project.updatedAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Respon Terkumpul</span>
                        <span className="font-semibold text-card-foreground">{responseCount} / {targetRespondents}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden relative">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-primary h-full rounded-full transition-all duration-300" 
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <Link 
                      href={`/dashboard/tools/data-analysis/kuesioner?id=${project.id}`}
                      className="btn btn-outline w-full flex items-center justify-center gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                      style={{ padding: "0.55rem 1rem", borderRadius: "8px", textDecoration: "none", fontSize: "0.875rem" }}
                    >
                      Buka Analisis
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
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
