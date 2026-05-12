import NotebookDetailPage from "./NotebookDetail";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Memuat Notebook...</div>}>
      <NotebookDetailPage />
    </Suspense>
  );
}
