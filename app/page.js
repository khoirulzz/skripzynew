import LandingClient from "./LandingClient";

export const metadata = {
  title: "Skripzy | AI Research OS untuk Mahasiswa",
  description: "Platform all-in-one berbasis AI untuk membantu mahasiswa dari tahap ide penelitian hingga skripsi selesai. Mulai penelitian lebih mudah dan cerdas.",
  keywords: ["skripsi", "AI", "mahasiswa", "penelitian", "tugas akhir", "tools skripsi", "generator bab 1", "proposal penelitian"],
  openGraph: {
    title: "Skripzy | AI Research OS",
    description: "Platform all-in-one berbasis AI untuk membantu mahasiswa dari tahap ide penelitian hingga skripsi selesai.",
    url: "https://skripzy.id",
    siteName: "Skripzy",
    images: [
      {
        url: "https://skripzy.id/og-image.png", // Fallback to an og-image if it exists
        width: 1200,
        height: 630,
        alt: "Skripzy AI Research OS",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skripzy | AI Research OS",
    description: "Platform all-in-one berbasis AI untuk membantu mahasiswa dari tahap ide penelitian hingga skripsi selesai.",
  },
};

export default function Home() {
  return <LandingClient />;
}
