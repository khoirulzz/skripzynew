import { Suspense } from "react";
import WorkspaceEditorClient from "./WorkspaceEditorClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Memuat Workspace...</div>}>
      <WorkspaceEditorClient />
    </Suspense>
  );
}
