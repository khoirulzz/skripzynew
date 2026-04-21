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
      
      // Initial System Greeting
      const systemInstruction = `Kamu adalah dosen penguji sidang skripsi. Karaktermu: ${profileInfo.label} (${profileInfo.desc}). 
Mahasiswa sedang mempresentasikan skripsi berjudul: "${skripsiTitle}".

Aturan main:
1. Mulailah percakapan dengan menyapa mahasiswa singkat dan berikan 1 pertanyaan kritis pertama tentang judul/latar belakang.
2. Tunggu balasan mahasiswa. 
3. Balaslah selalu dengan obrolan lisan layaknya dosen penguji (singkat, 2-3 kalimat saja).
4. Jika jawaban mahasiswa tidak nyambung, tegur secara natural.
5. Gunakan bahasa lisan formal namun natural (contoh: "Coba jelaskan...", "Saya kurang setuju...", "Lalu apa bedanya...?").`;

      const aiResponse = await callGemini({
        prompt: "Halo dosen penguji, saya siap untuk diuji.",
        systemInstruction: systemInstruction,
        model: MODELS.lite, // Lite merespons lebih cepat, cocok untuk chat
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
      const systemInstruction = `Kamu adalah dosen penguji sidang skripsi. Karaktermu: ${profileInfo.label}. Judul skripsi mahasiswa: "${skripsiTitle}". Selalu respon maksimal 3 kalimat secara lisan alamiah.`;

      const aiResponse = await callGemini({
        history: newHistory,
        systemInstruction: systemInstruction,
        model: MODELS.lite, // Lebih interaktif untuk chat
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

            <div className="form-group">
              <label className="form-label">Judul Lengkap Penelitian Anda</label>
              <textarea 
                className="form-input" 
                rows="3" 
                placeholder="Contoh: Pegaruh Algoritma Rekomendasi Terhadap Peningkatan Konsumsi Konten Video Pendek..."
                value={skripsiTitle}
                onChange={e => setSkripsiTitle(e.target.value)}
                disabled={plan === "free"}
              />
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Pilih Karakter Penguji (Dosen AI)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {DOSEN_PROFILES.map(d => (
                  <button
                    key={d.id} type="button"
                    onClick={() => setDosenProfile(d.id)}
                    disabled={plan === "free"}
                    style={{
                      textAlign: "left", padding: "1rem", borderRadius: "10px",
                      border: dosenProfile === d.id ? "2px solid #EC4899" : "2px solid var(--border)",
                      backgroundColor: dosenProfile === d.id ? "rgba(236,72,153,0.05)" : "transparent",
                      cursor: plan === "free" ? "not-allowed" : "pointer", opacity: plan === "free" ? 0.6 : 1
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: dosenProfile === d.id ? "#DB2777" : "var(--text-main)", marginBottom: "0.25rem" }}>{d.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{d.desc}</div>
                  </button>
                ))}
              </div>
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
