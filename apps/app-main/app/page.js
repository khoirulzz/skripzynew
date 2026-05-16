"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import DefaultSpinner from "@/components/ui/DefaultSpinner";

export default function AppRootPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <DefaultSpinner size="large" />
        <div className="text-muted-foreground animate-pulse">Redirecting to Skripzy...</div>
      </div>
    </div>
  );
}

