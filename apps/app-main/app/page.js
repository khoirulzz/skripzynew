"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

export default function AppRootPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Redirecting to Skripzy...</div>
    </div>
  );
}

