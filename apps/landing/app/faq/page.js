"use client";

import LegalLayout from "@/components/layout/LegalLayout";
import { useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="faq-item" style={{ borderBottom: "1px solid var(--border)", padding: "1rem 0" }}>
      <button 
        className="faq-question"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: "100%", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          background: "none",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          padding: 0,
          color: "var(--text-main)",
          fontWeight: 700,
          fontSize: "1rem",
          gap: "1rem"
        }}
      >
        <span style={{ minWidth: 0 }}>{question}</span>
        <PremiumIcon 
          name="chevronDown" 
          size={20} 
          style={{ 
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
            transition: "transform 0.3s ease" 
          }} 
        />
      </button>
      {isOpen && (
        <div className="faq-answer" style={{ marginTop: "0.85rem", color: "var(--text-muted)", lineHeight: 1.65, fontSize: "0.95rem" }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const faqs = [
    {
      question: "1. Apa itu Skripzy?",
      answer: "Skripzy adalah platform workspace penelitian berbasis AI yang dirancang untuk membantu mahasiswa, akademisi, dan pengguna lainnya dalam aktivitas penelitian, penulisan akademik, pengelolaan referensi, serta penggunaan alat bantu AI. Skripzy menyediakan berbagai fitur yang mendukung produktivitas akademik dan workflow penelitian dalam satu platform terintegrasi."
    },
    {
      question: "2. Apakah Skripzy menggunakan AI?",
      answer: "Ya. Skripzy menggunakan teknologi kecerdasan buatan (AI) untuk membantu berbagai aktivitas pengguna. Fitur AI dapat digunakan untuk brainstorming, penulisan akademik, pengelolaan referensi, analisis informasi, revisi dan evaluasi tulisan, serta produktivitas penelitian secara umum."
    },
    {
      question: "3. Apakah hasil AI selalu benar?",
      answer: "Tidak. AI dapat menghasilkan informasi yang tidak akurat, tidak lengkap, bias, atau tidak relevan dengan konteks tertentu. Pengguna wajib meninjau dan memverifikasi seluruh hasil AI sebelum digunakan untuk kebutuhan akademik, profesional, atau publikasi."
    },
    {
      question: "4. Apakah Skripzy aman digunakan untuk kebutuhan akademik?",
      answer: "Skripzy dirancang sebagai alat bantu produktivitas dan penelitian. Namun, pengguna tetap bertanggung jawab memastikan penggunaan layanan sesuai aturan institusi masing-masing, mengikuti etika akademik, dan tidak melanggar kebijakan kampus."
    },
    {
      question: "5. Apakah penggunaan AI diperbolehkan untuk tugas atau skripsi?",
      answer: "Setiap institusi pendidikan memiliki aturan berbeda. Pengguna bertanggung jawab memahami kebijakan institusi masing-masing. Skripzy mendukung penggunaan AI secara etis sebagai alat bantu pembelajaran, bukan sebagai pengganti penuh proses akademik."
    },
    {
      question: "6. Apakah Skripzy mendukung plagiarisme atau cheating akademik?",
      answer: "Tidak. Skripzy melarang plagiarisme, pemalsuan penelitian, manipulasi data, kecurangan akademik, dan penyalahgunaan AI untuk melanggar aturan institusi. Pelanggaran dapat menyebabkan pembatasan atau penghentian layanan."
    },
    {
      question: "7. Bagaimana sistem subscription di Skripzy bekerja?",
      answer: "Skripzy menggunakan sistem subscription untuk akses fitur dan sistem kredit untuk penggunaan fitur AI tertentu. Sebagian fitur premium hanya tersedia pada paket tertentu, dan setiap penggunaan AI dapat mengurangi jumlah kredit pengguna."
    },
    {
      question: "8. Apa perbedaan paket Free, Pro, dan Plus?",
      answer: "Free memberikan akses dasar dengan fitur terbatas. Pro memberikan akses fitur lebih luas dan kredit bulanan lebih besar. Plus memberikan akses fitur lanjutan, kredit maksimal, serta prioritas layanan tertentu."
    },
    {
      question: "9. Apa itu kredit?",
      answer: "Kredit adalah unit penggunaan untuk mengakses fitur AI seperti generate teks, chat AI, analisis dokumen, dan tools AI lainnya. Jumlah penggunaan kredit berbeda tergantung fitur yang digunakan."
    },
    {
      question: "10. Apakah kredit memiliki masa berlaku?",
      answer: "Ya. Kredit subscription dan kredit top-up memiliki masa berlaku tertentu. Kredit yang telah kedaluwarsa akan hangus sesuai sistem yang berlaku."
    },
    {
      question: "11. Apa yang terjadi jika subscription saya berakhir?",
      answer: "Akun akan kembali ke paket Free, fitur premium dibatasi, akses AI berkurang, dan kredit subscription tertentu dapat hangus. Namun, sebagian data workspace tetap tersedia sesuai kebijakan."
    },
    {
      question: "12. Apakah saya bisa melakukan top-up kredit?",
      answer: "Ya, pengguna dapat membeli kredit tambahan melalui sistem top-up untuk menambah kapasitas penggunaan AI di luar kuota bulanan subscription."
    },
    {
      question: "13. Apakah pembayaran bisa direfund?",
      answer: "Refund hanya tersedia dalam kondisi tertentu sesuai Kebijakan Refund. Sebagian transaksi digital bersifat tidak dapat dikembalikan setelah layanan digunakan."
    },
    {
      question: "14. Metode pembayaran apa yang digunakan?",
      answer: "Pembayaran diproses melalui layanan pihak ketiga yang tersedia pada platform menggunakan mata uang Rupiah (IDR)."
    },
    {
      question: "15. Apakah data dan dokumen saya disimpan?",
      answer: "Sebagian data disimpan untuk menjalankan layanan dan menjaga keberlangsungan workspace. Skripzy berupaya membatasi penyimpanan sesuai kebutuhan layanan. Detailnya ada di Privacy Policy."
    },
    {
      question: "16. Apakah data saya aman?",
      answer: "Skripzy menerapkan langkah keamanan wajar, namun tidak ada sistem digital yang dijamin 100% aman. Pengguna bertanggung jawab menjaga keamanan akun masing-masing."
    },
    {
      question: "17. Apakah saya bisa menghapus akun?",
      answer: "Ya, pengguna dapat menghapus akun melalui pengaturan akun di dalam platform setelah melalui proses verifikasi keamanan."
    },
    {
      question: "18. Apakah Skripzy menyimpan riwayat chat AI?",
      answer: "Sebagian interaksi dapat tidak disimpan secara permanen, namun sebagian data diproses terbatas untuk menjaga kualitas layanan dan keamanan sistem."
    },
    {
      question: "19. Apakah saya boleh membagikan akun?",
      answer: "Tidak. Pengguna dilarang membagikan, menjual, atau memindahtangankan akun tanpa izin resmi. Pelanggaran dapat menyebabkan penghentian layanan."
    },
    {
      question: "20. Bagaimana cara menghubungi Skripzy?",
      answer: "Pengguna dapat menghubungi melalui email cs@skripzy.id (Customer Support), business@skripzy.id (Bisnis), atau melalui lokasi operasional kami di Pekalongan, Jawa Tengah."
    }
  ];

  return (
    <LegalLayout title="Frequently Asked Questions (FAQ)" lastUpdated="6 Mei 2026">
      <p style={{ marginBottom: "1.4rem" }}>
        Halaman FAQ ini dibuat untuk membantu pengguna memahami layanan, fitur, sistem subscription, penggunaan AI, serta kebijakan umum pada platform Skripzy ID.
      </p>
      
      <div style={{ marginBottom: "2rem" }}>
        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>

      <hr />

      <h2>Masih Butuh Bantuan?</h2>
      <p>Jika pengguna memiliki pertanyaan lain yang belum tercantum di halaman ini, pengguna dapat menghubungi tim Skripzy melalui:</p>
      <ul>
        <li>Customer Support: <a href="mailto:cs@skripzy.id">cs@skripzy.id</a></li>
        <li>Email Bisnis: <a href="mailto:business@skripzy.id">business@skripzy.id</a></li>
        <li>Website: <a href="https://skripzy.id">https://skripzy.id</a></li>
      </ul>
      <style jsx global>{`
        @media (max-width: 768px) {
          .faq-item {
            padding: 0.75rem 0 !important;
          }
          .faq-question {
            font-size: 0.86rem !important;
            line-height: 1.35 !important;
          }
          .faq-answer {
            font-size: 0.82rem !important;
            line-height: 1.55 !important;
            margin-top: 0.65rem !important;
          }
        }
      `}</style>
    </LegalLayout>
  );
}
