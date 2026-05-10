import { Suspense } from "react";
import PublicFormPageClient from "../PublicFormPageClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Memuat Form...</div>}>
      <PublicFormPageClient />
    </Suspense>
  );
}
