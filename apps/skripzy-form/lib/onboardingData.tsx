import { FileText, CheckCircle, PenTool, LayoutTemplate, ShieldAlert } from 'lucide-react';
import React from 'react';

export const onboardingData: Record<string, {title: string, description: string, icon: React.ReactNode}[]> = {
  'skripzy-form': [
    {
      title: 'Selamat Datang di Skripzy Forms',
      description: 'Pembuat kuesioner akademik cerdas. Susun pertanyaan, bagikan ke responden, dan dapatkan analisis data otomatis dalam satu tempat.',
      icon: <LayoutTemplate className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Generator Kuesioner AI',
      description: 'Gunakan AI Builder untuk membuat kuesioner skala Likert otomatis. Anda cukup memasukkan variabel penelitian, dan AI akan merumuskan indikator serta pertanyaannya.',
      icon: <PenTool className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Analisis Statistik Instan',
      description: 'Tidak perlu pindah aplikasi ke SPSS. Setelah data terkumpul, Anda bisa langsung menjalankan uji validitas, reliabilitas, hingga regresi linear dengan sekali klik.',
      icon: <CheckCircle className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Privasi & Keamanan Data',
      description: 'Data responden dan formulir Anda tersimpan dengan aman dan hanya dapat diakses melalui akun Anda.',
      icon: <ShieldAlert className="w-12 h-12 text-emerald-500" />
    }
  ]
};
