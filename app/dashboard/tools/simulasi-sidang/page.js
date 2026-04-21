"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { callGemini, MODELS } from "@/lib/callWorker";
import { deductCredits } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const COST_SESSION = 5;
const API_GROUP = "group_2";

const DOSEN_PROFILES = [
  { id: "killer", label: "Dosen Killer", desc: "Sangat kritis, to the point, mencari kelemahan skripsi.", temp: 0.2 },
  { id: "kritis", label: "Dosen Kritis", desc: "Logis, menguji metodologi dan dasar teori dengan tajam.", temp: 0.4 },
  { id: "santai", label: "Dosen Santai", desc: "Ramah, namun tetap bertanya seputar esensi penelitian.", temp: 0.7 },
  { id: "suportif", label: "Dosen Suportif", desc: "Menggiring opini, membimbing memberikan saran perbaikan.", temp: 0.8 },
];

export default function SimulasiSidangPage() {
  const { user, userData } = useAuth();
  const credits = userData?.credits ?? 0;
  const plan = userData?.plan || "free";

  // Setup State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [skripsiTitle, setSkripsiTitle] = useState("");
  const [dosenProfile, setDosenProfile] = useState("kritis");
  const [sidangMode, setSidangMode] = useState("skripsi"); // "proposal" or "skripsi"
  const [uploadedDocUrl, setUploadedDocUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Chat State
  const [messages, setMessages] = useState([]); // { role: 'model'|'user', text: '' }
  const [currentInput, setCurrentInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Speech State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "id-ID";

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setCurrentInput(prev => prev + " " + transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages, chatLoading]);

  // TTS function
  const speak = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop playing anything
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;
      utterance.pitch = dosenProfile === "killer" ? 0.8 : dosenProfile === "suportif" ? 1.2 : 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!skripsiTitle.trim()) { setSetupError("Judul skripsi wajib diisi."); return; }
    if (credits < COST_SESSION) { setSetupError(`Kredit tidak cukup. Butuh ${COST_SESSION} credit.`); return; }

    setSetupLoading(true);
    setSetupError("");

    try {
      await deductCredits(user.uid, COST_SESSION);
      
      const profileInfo = DOSEN_PROFILES.find(p => p.id === dosenProfile);
      
      // Initial System Greeting with document reference
      let systemInstruction = `Kamu adalah dosen penguji sidang ${sidangMode === "proposal" ? "proposal" : "skripsi"}. Karaktermu: ${profileInfo.label} (${profileInfo.desc}). 
Mahasiswa sedang mempresentasikan ${sidangMode === "proposal" ? "proposal" : "skripsi"} berjudul: "${skripsiTitle}".`;

      if (uploadedDocUrl) {
        systemInstruction += `\n\nDokumen reference ${sidangMode === "proposal" ? "proposal" : "skripsi"}: ${uploadedDocUrl}\nGunakan dokumen ini sebagai referensi untuk membuat pertanyaan yang relevan dan mendalam.`;
      }

      systemInstruction += `\n\nAturan main:
1. Mulailah percakapan dengan menyapa mahasiswa singkat dan berikan 1 pertanyaan kritis pertama tentang judul/latar belakang.
2. Tunggu balasan mahasiswa. 
3. Balaslah selalu dengan obrolan lisan layaknya dosen penguji (singkat, 2-3 kalimat saja).
4. Jika jawaban mahasiswa tidak nyambung, tegur secara natural.
5. Gunakan bahasa lisan formal namun natural (contoh: "Coba jelaskan...", "Saya kurang setuju...", "Lalu apa bedanya...?").`;

      const aiResponse = await callGemini({
        prompt: "Halo dosen penguji, saya siap untuk diuji.",
        systemInstruction: systemInstruction,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: profileInfo.temp,
      });

      setMessages([
        { role: "model", text: aiResponse }
      ]);
      setIsSessionActive(true);
      speak(aiResponse);

    } catch (err) {
      setSetupError(err.message || "Gagal memulai sesi sidang.");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!currentInput.trim() || chatLoading) return;

    const userMessage = currentInput.trim();
    setCurrentInput("");
    
    // Stop speaking if still speaking
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const newHistory = [...messages, { role: "user", text: userMessage }];
    setMessages(newHistory);
    setChatLoading(true);

    try {
      const profileInfo = DOSEN_PROFILES.find(p => p.id === dosenProfile);
      let systemInstruction = `Kamu adalah dosen penguji sidang ${sidangMode === "proposal" ? "proposal" : "skripsi"}. Karaktermu: ${profileInfo.label}. Judul ${sidangMode === "proposal" ? "proposal" : "skripsi"} mahasiswa: "${skripsiTitle}".`;
      
      if (uploadedDocUrl) {
        systemInstruction += `\n\nReferensi dokumen: ${uploadedDocUrl}\nGunakannya untuk membuat pertanyaan yang lebih mendalam dan relevan.`;
      }
      
      systemInstruction += `\n\nSelalu respon maksimal 3 kalimat secara lisan alamiah.`;

      const aiResponse = await callGemini({
        history: newHistory,
        systemInstruction: systemInstruction,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: profileInfo.temp,
      });

      setMessages(prev => [...prev, { role: "model", text: aiResponse }]);
      speak(aiResponse);

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Browser Anda tidak mendukung Web Speech API (Coba gunakan Google Chrome).");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        // Stop currently playing TTS so mic doesn't catch it
        if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEndSession = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSessionActive(false);
    setMessages([]);
    setSkripsiTitle("");
    setUploadedDocUrl(null);
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Hanya file PDF yang didukung.");
      return;
    }

    setUploading(true);
    try {
      // Get Cloudinary signature from worker
      const sigResponse = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/api/cloudinary-sign`, {
        method: "POST",
        headers: { "x-skripzy-secret": process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234" },
      });

      if (!sigResponse.ok) throw new Error("Gagal mendapatkan signature Cloudinary");

      const { signature, timestamp, cloudName, apiKey } = await sigResponse.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("folder", "Sidang");
      formData.append("resource_type", "auto");

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );

      if (!uploadResponse.ok) throw new Error("Upload Cloudinary gagal");

      const uploaded = await uploadResponse.json();
      setUploadedDocUrl(uploaded.secure_url);
      alert(`✅ Dokumen berhasil diupload!\nDosen AI akan merujuk dokumen ini saat menguji.`);
    } catch (err) {
      console.error("Upload error:", err);
      alert(`❌ Gagal upload dokumen: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        {isSessionActive ? (
          <button onClick={handleEndSession} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
             <PremiumIcon name="arrowLeft" size={20} />
          </button>
        ) : (
          <Link href="/dashboard" style={{ color: "var(--text-muted)" }}><PremiumIcon name="arrowLeft" size={20} /></Link>
        )}
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Simulasi Sidang AI</h1>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>Latihan presentasi dan tanya jawab layaknya sidang sungguhan</p>
        </div>
        {!isSessionActive && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.85rem", backgroundColor: "rgba(236, 72, 153, 0.1)", borderRadius: "var(--radius-lg)", fontSize: "0.8rem", fontWeight: 600, color: "#DB2777" }}>
            <PremiumIcon name="barChart" size={14} />
            <span>{COST_SESSION} credit / sesi</span>
            <span style={{ padding: "1px 6px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", borderRadius: "8px", fontSize: "0.6rem", fontWeight: 800 }}>PRO</span>
          </div>
        )}
      </div>

      {plan === "free" && !isSessionActive && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>Fitur Khusus Pro & Plus</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Simulasi Sidang eksklusif untuk paket berbayar.</p>
          </div>
          <Link href="/dashboard/langganan" className="btn btn-primary" style={{ flexShrink: 0 }}>Upgrade</Link>
        </div>
      )}

      {/* SETUP PHASE */}
      {!isSessionActive && (
        <div className="glass-panel p-6">
          <form onSubmit={handleStartSession}>
            <h2 style={{ fontSize: "1.2rem", margin: "0 0 1.5rem 0" }}>Persiapan Sidang</h2>
            
            {setupError && (
               <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem" }}>
                 {setupError}
               </div>
            )}

            {/* Mode Selection: Proposal vs Skripsi */}
            <div className="form-group">
              <label className="form-label">Jenis Sidang</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                {["proposal", "skripsi"].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSidangMode(mode)}
                    disabled={plan === "free"}
                    style={{
                      textAlign: "center", padding: "1rem", borderRadius: "10px",
                      border: sidangMode === mode ? "2px solid #EC4899" : "2px solid var(--border)",
                      backgroundColor: sidangMode === mode ? "rgba(236,72,153,0.05)" : "transparent",
                      cursor: plan === "free" ? "not-allowed" : "pointer", 
                      opacity: plan === "free" ? 0.6 : 1,
                      fontWeight: 600,
                      color: sidangMode === mode ? "#DB2777" : "var(--text-main)",
                      textTransform: "capitalize"
                    }}
                  >
                    📋 Sidang {mode === "proposal" ? "Proposal" : "Skripsi"}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Judul Lengkap {sidangMode === "proposal" ? "Proposal" : "Skripsi"} Anda</label>
              <textarea 
                className="form-input" 
                rows="3" 
                placeholder={sidangMode === "proposal" ? "Contoh: Proposal Pengaruh Algoritma Rekomendasi..." : "Contoh: Penelitian Pengaruh Algoritma Rekomendasi..."}
                value={skripsiTitle}
                onChange={e => setSkripsiTitle(e.target.value)}
                disabled={plan === "free"}
              />
            </div>

            {/* Document Upload */}
            <div className="form-group">
              <label className="form-label">Upload Dokumen {sidangMode === "proposal" ? "Proposal" : "Skripsi"} (Opsional)</label>
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "1.5rem 1rem", border: "2px dashed var(--border)", borderRadius: "8px",
                cursor: uploading ? "not-allowed" : "pointer", 
                backgroundColor: uploadedDocUrl ? "rgba(16, 185, 129, 0.05)" : "var(--surface-hover)", 
                gap: "0.5rem", textAlign: "center",
                opacity: uploading ? 0.6 : 1,
                transition: "all 0.2s"
              }}>
                {uploadedDocUrl ? (
                  <>
                    <PremiumIcon name="checkCircle" size={24} style={{ color: "var(--success)" }} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: 600 }}>✅ Dokumen Terupload</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Dosen AI akan merujuk dokumen ini</span>
                    <a href={uploadedDocUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--primary)", textDecoration: "underline", marginTop: "0.25rem" }}>
                      Lihat Dokumen
                    </a>
                  </>
                ) : (
                  <>
                    <PremiumIcon name={uploading ? "loader" : "uploadCloud"} size={24} className={uploading ? "animate-spin" : ""} style={{ color: "var(--text-muted)" }} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{uploading ? "Mengupload..." : "Upload PDF Dokumen"}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", opacity: 0.7 }}>Drag & drop atau klik untuk memilih file</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept=".pdf" 
                  style={{ display: "none" }} 
                  onChange={handleDocumentUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ background: "linear-gradient(135deg, #EC4899, #BE185D)" }}
                disabled={setupLoading || !skripsiTitle.trim() || plan === "free"}
              >
                {setupLoading ? "Menyiapkan Sidang..." : "Masuk Ruang Sidang"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHAT/SESSION PHASE */}
      {isSessionActive && (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "65vh" }}>
          
          {/* Room info header */}
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(236,72,153,0.02)" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Ruang Sidang Live</div>
              <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.95rem" }}>{DOSEN_PROFILES.find(p=>p.id===dosenProfile).label}</div>
            </div>
            <button onClick={handleEndSession} className="btn btn-outline" style={{ borderColor: "var(--danger)", color: "var(--danger)", padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
              Akhiri Sidang
            </button>
          </div>

          {/* Chat history */}
          <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div key={idx} style={{ 
                  alignSelf: isUser ? "flex-end" : "flex-start", 
                  maxWidth: "80%", 
                  display: "flex", gap: "0.75rem", flexDirection: isUser ? "row-reverse" : "row" 
                }}>
                  <div style={{ 
                    width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isUser ? "var(--primary-light)" : "var(--surface-hover)",
                    color: isUser ? "var(--primary)" : "var(--text-muted)"
                  }}>
                    <PremiumIcon name={isUser ? "user" : "mic"} size={18} />
                  </div>
                  <div style={{ 
                    backgroundColor: isUser ? "var(--primary)" : "var(--surface-hover)", 
                    color: isUser ? "#fff" : "var(--text-main)",
                    padding: "0.85rem 1.25rem", borderRadius: "16px", 
                    borderTopRightRadius: isUser ? 0 : "16px", borderTopLeftRadius: !isUser ? 0 : "16px",
                    lineHeight: 1.6, fontSize: "0.95rem", whiteSpace: "pre-wrap"
                  }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            
            {chatLoading && (
               <div style={{ alignSelf: "flex-start", display: "flex", gap: "0.75rem" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PremiumIcon name="mic" size={18} className="text-muted" />
                  </div>
                  <div style={{ padding: "0.85rem 1.25rem", borderRadius: "16px", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                     <div className="animate-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--text-muted)" }} />
                     <div className="animate-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--text-muted)", animationDelay: "150ms" }} />
                     <div className="animate-pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--text-muted)", animationDelay: "300ms" }} />
                  </div>
               </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <button 
              onClick={toggleRecording}
              style={{
                width: "48px", height: "48px", borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: isRecording ? "rgba(239,68,68,0.1)" : "var(--surface-hover)",
                color: isRecording ? "var(--danger)" : "var(--text-muted)",
                transition: "all 0.2s"
              }}
              title="Gunakan mikrofon"
            >
              <PremiumIcon name="mic" size={24} className={isRecording ? "animate-pulse" : ""} />
            </button>
            <div style={{ flex: 1, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "24px", padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
              <input
                 type="text"
                 value={currentInput}
                 onChange={e => setCurrentInput(e.target.value)}
                 onKeyDown={e => { if (e.key === "Enter") handleSendMessage(); }}
                 placeholder={isRecording ? "Sedang mendengarkan..." : "Ketik respon Anda (atau pakai mic)..."}
                 style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "0.95rem" }}
               />
            </div>
            <button 
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || chatLoading}
              style={{
                width: "48px", height: "48px", borderRadius: "50%", border: "none", cursor: currentInput.trim() ? "pointer" : "not-allowed", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: currentInput.trim() ? "var(--primary)" : "var(--surface-hover)",
                color: currentInput.trim() ? "white" : "var(--text-muted)"
              }}
            >
              <PremiumIcon name="send" size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
