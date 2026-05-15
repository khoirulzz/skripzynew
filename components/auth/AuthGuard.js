"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export function AuthGuard({ children, requireAuth = true }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push("/login");
      } else if (!requireAuth && user) {
        // Redirect based on role
        if (userData?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [user, userData, loading, requireAuth, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ gap: '1rem' }}>
        <LoadingSpinner size={48} className="text-primary" />
        <p className="text-muted" style={{ fontWeight: 500 }}>Memuat sesi...</p>
      </div>
    );
  }

  // Mencegah flash/kedipan konten yang diamankan sebelum diarahkan
  if (requireAuth && !user) return null;
  if (!requireAuth && user) return null;

  return <>{children}</>;
}
