import { Suspense } from "react";
import PublicFormClient from "./PublicFormClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Memuat Formulir...</div>}>
      <PublicFormClient />
    </Suspense>
  );
}
