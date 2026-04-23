"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function AdminGuard({ children }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check if user exists and has admin role
      if (!user) {
        router.push("/login");
      } else if (userData?.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ gap: "1rem" }}>
        <PremiumIcon name="zap" size={48} className="text-primary" style={{ animation: "pulse 2s infinite" }} />
        <p className="text-muted" style={{ fontWeight: 500 }}>Memuat sesi admin...</p>
      </div>
    );
  }

  // Prevent flash before redirect
  if (!user || userData?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
