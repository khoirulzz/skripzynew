import { 
  Bot, 
  Sparkles, 
  Search, 
  FileText, 
  CheckCircle, 
  Wand2, 
  LineChart, 
  BookOpen, 
  RefreshCcw, 
  ShieldAlert, 
  MessageSquare,
  Zap,
  Users
} from 'lucide-react';

export const onboardingData = {
  'asisten-ai': [
    {
      title: 'Selamat Datang di Asisten AI',
      description: 'Bantuan cerdas untuk mencari ide judul dan menyusun draf latar belakang skripsi Anda.',
      icon: <Bot className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Generator Judul (Novelty)',
      description: 'AI akan mencari jurnal dari database global, menganalisis research gap, dan merekomendasikan judul beserta rumusan masalahnya secara otomatis.',
      icon: <Sparkles className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Draf Latar Belakang',
      description: 'Susun latar belakang penelitian dengan narasi alami. Anda hanya perlu memasukkan fenomena umum dan masalah spesifik, dan AI akan merangkaikannya menjadi draf akademik.',
      icon: <FileText className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Penting: Riwayat Tidak Disimpan',
      description: 'Pastikan Anda menyalin hasil generate (ide judul atau latar belakang) ke dokumen pribadi Anda (seperti Workspace atau Notebook), karena sistem tidak menyimpan riwayat teks di halaman ini.',
      icon: <ShieldAlert className="w-12 h-12 text-amber-500" />
    }
  ],
  'referensi': [
    {
      title: 'Referensi Cerdas',
      description: 'Mesin pencari jurnal global yang memungkinkan Anda menemukan literatur akademik terbaik dalam hitungan detik.',
      icon: <Search className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Ringkas Abstrak Instan',
      description: 'Gunakan AI untuk meringkas abstrak jurnal berbahasa asing menjadi bahasa Indonesia yang mudah dipahami, lengkap dengan temuan intinya.',
      icon: <Zap className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Akses Full-text PDF',
      description: 'Jika tersedia dalam skema open-access, Anda akan melihat label "Full-text PDF Tersedia" yang bisa langsung Anda klik dan baca.',
      icon: <BookOpen className="w-12 h-12 text-indigo-500" />
    }
  ],
  'cek-grammar': [
    {
      title: 'Cek Grammar',
      description: 'Periksa tata bahasa dan struktur kalimat secara otomatis agar karya tulis Anda terlihat profesional dan bebas dari typo.',
      icon: <CheckCircle className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Saran Perbaikan Detail',
      description: 'Tidak sekadar menyalahkan, AI akan memberikan saran perbaikan kata per kata sehingga kalimat Anda menjadi lebih efektif dan sesuai standar baku.',
      icon: <Wand2 className="w-12 h-12 text-indigo-500" />
    }
  ],
  'data-analysis': [
    {
      title: 'Analisis Data',
      description: 'Ketahui metode analisis statistik apa yang paling cocok untuk rumusan masalah dan hipotesis penelitian Anda.',
      icon: <LineChart className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Interpretasi Hasil Output',
      description: 'Punya output SPSS atau Amos tapi bingung cara membacanya? Masukkan data hasil uji di sini dan AI akan menginterpretasikannya dalam bahasa yang mudah dipahami.',
      icon: <FileText className="w-12 h-12 text-indigo-500" />
    }
  ],
  'humanizer': [
    {
      title: 'Humanizer AI',
      description: 'Ubah teks yang kaku dan terdeteksi sebagai AI menjadi gaya bahasa yang jauh lebih natural, seperti tulisan manusia sungguhan.',
      icon: <Users className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Keseimbangan Akademis',
      description: 'Fitur ini didesain khusus agar teks tetap mempertahankan bobot dan nuansa akademisnya, meskipun polanya telah diubah menjadi lebih organik.',
      icon: <Sparkles className="w-12 h-12 text-indigo-500" />
    }
  ],
  'notebook': [
    {
      title: 'Notebook (Catatan)',
      description: 'Simpan semua ide, potongan kalimat, dan referensi berharga Anda di satu tempat yang aman dan mudah diakses.',
      icon: <BookOpen className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Auto-Save',
      description: 'Berbeda dengan Quicktools lainnya, catatan yang Anda tulis di sini akan tersimpan otomatis dan permanen di akun Anda.',
      icon: <CheckCircle className="w-12 h-12 text-emerald-500" />
    }
  ],
  'parafrase': [
    {
      title: 'Parafrase Pintar',
      description: 'Tulis ulang kalimat atau paragraf untuk menghindari plagiarisme (Turnitin) tanpa mengubah makna asli.',
      icon: <RefreshCcw className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Pilihan Gaya Bahasa',
      description: 'Sesuaikan hasil parafrase menjadi lebih formal, akademis, atau lebih santai sesuai dengan kebutuhan penulisan Anda.',
      icon: <Wand2 className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Ingat: Salin Hasil Anda',
      description: 'Sistem tidak menyimpan riwayat teks sebelum/sesudah diparafrase. Pastikan Anda telah menyalinnya ke dokumen Anda.',
      icon: <ShieldAlert className="w-12 h-12 text-amber-500" />
    }
  ],
  'simulasi-sidang': [
    {
      title: 'Simulasi Sidang',
      description: 'Latih mental dan kesiapan Anda sebelum menghadapi dosen penguji dengan simulasi tanya-jawab yang realistis.',
      icon: <MessageSquare className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Evaluasi Jawaban',
      description: 'Dapatkan feedback langsung terhadap setiap jawaban yang Anda berikan. AI akan memberitahu apakah argumen Anda sudah cukup kuat atau masih perlu perbaikan.',
      icon: <CheckCircle className="w-12 h-12 text-indigo-500" />
    }
  ],
  'ai-detector': [
    {
      title: 'AI Detector',
      description: 'Cek apakah tulisan Anda memiliki indikasi kuat ditulis menggunakan AI (seperti ChatGPT/Gemini) sebelum diuji oleh pihak kampus.',
      icon: <ShieldAlert className="w-12 h-12 text-indigo-500" />
    },
    {
      title: 'Analisis Detail',
      description: 'Dapatkan persentase probabilitas AI dan sorotan kalimat yang paling mencurigakan agar Anda bisa segera memodifikasinya.',
      icon: <Search className="w-12 h-12 text-indigo-500" />
    }
  ]
};
