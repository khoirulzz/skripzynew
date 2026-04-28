import NotebookDetailPage from "./NotebookDetail";

export const dynamic = "force-static";

// Required for static export (output: "export") with dynamic routes
export async function generateStaticParams() {
  return [{ id: "index" }];
}

export default function Page({ params }) {
  return <NotebookDetailPage params={params} />;
}
