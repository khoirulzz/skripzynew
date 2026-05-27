"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { DataHub } from "@/components/workspace/DataHub";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { d1Request } from "@/lib/d1Client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

function KuesionerWorkspaceContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);

    const workspaceId = searchParams.get("id");

    useEffect(() => {
        if (!workspaceId) {
            router.push("/dashboard/tools/data-analysis");
            return;
        }
        async function loadWorkspace() {
            try {
                const resp = await d1Request("workspaces", { id: workspaceId });
                if (resp.data) {
                    setWorkspace(resp.data);
                } else {
                    router.push("/dashboard/tools/data-analysis");
                }
            } catch (err) {
                console.error("Gagal memuat workspace:", err);
            } finally {
                setLoading(false);
            }
        }
        loadWorkspace();
    }, [workspaceId, router]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!workspace) {
        return null;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6 animate-fade-in">
            <DataHub workspaceId={workspaceId} hideQualitative={true} />
        </div>
    );
}

export default function KuesionerWorkspacePage() {
    return (
        <Suspense fallback={
            <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        }>
            <KuesionerWorkspaceContent />
        </Suspense>
    );
}
