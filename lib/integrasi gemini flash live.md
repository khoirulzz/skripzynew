 Fitur Gemini Live (Multimodal Live API) tidak bisa diaktifkan melalui endpoint REST API biasa. REST API (menggunakan protokol https://) bekerja dengan prinsip stateless (kirim request, tunggu respons, lalu koneksi diputus). Karena Live Call membutuhkan aliran data audio mentah yang saling bersahutan secara real-time tanpa jeda, fitur ini wajib menggunakan protokol WebSocket (wss://).

Arsitektur di Next.js
Dalam ekosistem Next.js, kamu tidak disarankan menaruh koneksi WebSocket ini di dalam API Routes (folder app/api/ atau pages/api/). Lingkungan Serverless Next.js memiliki batas waktu eksekusi yang pendek (biasanya 10-60 detik). Jika sesi telepon berlangsung lebih dari itu, fungsi server akan dimatikan paksa oleh hosting (seperti Vercel) dan telepon akan terputus.

Solusi paling ideal adalah melakukan inisiasi WebSocket langsung di sisi Client Component (komponen frontend yang berjalan di browser pengguna).

Contoh Kode Next.js (Client Component)
Berikut adalah contoh kerangka implementasi dasar di Next.js (app/page.tsx atau komponen spesifik) untuk membuka koneksi WebSocket, mengirim konfigurasi setup (pemilihan suara), dan bersiap menerima respons audio.

TypeScript
"use client";

import { useEffect, useRef, useState } from "react";

export default function GeminiLiveCall() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Endpoint WSS resmi dari Google
  const HOST = "generativelanguage.googleapis.com";
  const MODEL = "models/gemini-2.0-flash-exp"; // Gunakan versi model Live yang tersedia
  const API_KEY = "xxxx"; // Ganti dengan API Key milikmu
  
  const wsUrl = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  const startCall = () => {
    // 1. Inisiasi koneksi WebSocket
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket Terhubung!");
      setIsConnected(true);

      // 2. Wajib kirim pesan SETUP pertama kali setelah koneksi terbuka
      const setupMessage = {
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede" // Pilih suara bot di sini
                }
              }
            }
          }
        }
      };
      
      // Kirim format JSON yang diubah ke string
      ws.send(JSON.stringify(setupMessage));
    };

    ws.onmessage = (event) => {
      // 3. Menangani respons dari Gemini
      // Respons bisa berupa teks (JSON) metadata, atau Blob/ArrayBuffer (Audio biner)
      if (typeof event.data === "string") {
        const response = JSON.parse(event.data);
        console.log("Respons JSON Server:", response);
        // Di sini kamu bisa menangkap transkripsi teks jika diaktifkan
      } else {
        // Ini adalah aliran data audio PCM mentah dari bot
        // Data biner ini perlu diumpankan ke Web Audio API untuk diputar
        console.log("Menerima chunk audio berukuran:", event.data.byteLength);
        // playAudioChunk(event.data); <-- Fungsi kustom untuk memutar audio
      }
    };

    ws.onclose = () => {
      console.log("Koneksi Telepon Terputus.");
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("Terjadi kesalahan WebSocket:", error);
    };
  };

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Bersihkan koneksi jika komponen di-unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Integrasi Chat Bot Call</h1>
      
      <div className="flex gap-4">
        <button 
          onClick={startCall} 
          disabled={isConnected}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Mulai Panggilan
        </button>
        
        <button 
          onClick={endCall} 
          disabled={!isConnected}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Tutup Panggilan
        </button>
      </div>

      <div className="mt-4">
        Status: {isConnected ? "Sedang dalam panggilan 🟢" : "Terputus 🔴"}
      </div>
    </div>
  );
}
Catatan Keamanan Penting
Menaruh API_KEY langsung di komponen frontend seperti contoh di atas akan mengekspos kunci rahasiamu ke pengguna (mereka bisa melihatnya dari Inspect Element > Network).

Untuk aplikasi skala produksi atau level enterprise, disarankan agar URL frontend kamu tidak langsung menembak ke generativelanguage.googleapis.com, melainkan menembak ke proxy server milikmu (misalnya menumpang lewat layanan edge computing yang me-route lalu lintas). Server perantara inilah yang bertugas menyuntikkan API Key rahasia ke URL tujuan akhir, sehingga klien di browser tidak akan pernah tahu apa kunci API yang digunakan.