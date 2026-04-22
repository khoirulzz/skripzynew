"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGemini, callGeminiStream, MODELS, getGeminiLiveProxyUrl } from "@/lib/callWorker";
import { deductCredits } from "@/lib/credits";
import { GeminiLiveClient, VOICE_OPTIONS } from "@/lib/geminiLiveClient";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

// ── Constants ────────────────────────────────────────────────
const CREDIT_PER_MSG = 1;
const CREDIT_CALL_START = 3;
const CHAT_GROUPS = "group_4,group_1";
const CALL_GROUPS = "group_4,group_1";

const SYSTEM_INSTRUCTION = `Kamu adalah "Dosen AI" di platform Skripzy, asisten akademik berbahasa Indonesia.
Peranmu:
- Menjawab pertanyaan seputar metodologi penelitian, struktur skripsi, teknik penulisan ilmiah, analisis data, serta hal lain yang relevan dengan karya ilmiah.
- Berbicara layaknya dosen pembimbing yang sabar dan suportif, namun tetap akademis.
- Fleksibilitas Jawaban: Jika pertanyaan bersifat umum atau "small talk", jawablah dengan singkat (2-4 kalimat). Namun, jika pertanyaan bersifat teknis, meminta penjelasan metode, atau jika kamu melakukan pencarian internet yang membutuhkan ringkasan mendalam, berikan jawaban yang lebih komprehensif, terstruktur, dan detail sesuai kebutuhan informasi tersebut.
- Jika pertanyaan di luar konteks akademik/penelitian, tolak dengan sopan.
- Gunakan bahasa Indonesia formal tapi komunikatif`;

export default function ChatDosenAIPage() {
  const { user, userData } = useAuth();
  const credits = userData?.credits ?? 0;

  const [mode, setMode] = useState("chat");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false); // UI indicator saat API sedang bekerja
  const [webSearchActive, setWebSearchActive] = useState(false); // State pemicu manual
  const [expandedThinking, setExpandedThinking] = useState({}); // Track which thinking blocks are expanded
  const chatEndRef = useRef(null);

  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("idle"); // idle | listening | speaking | connecting | error
  const [callTranscript, setCallTranscript] = useState([]);
  const recognitionRef = useRef(null);
  const callEndRef = useRef(null);

  const [selectedVoice, setSelectedVoice] = useState("Aoede");
  const [expandedVoiceOptions, setExpandedVoiceOptions] = useState(false);
  const [useLiveMode, setUseLiveMode] = useState(true);

  const liveClientRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioProcessorRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    callEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [callTranscript, callStatus]);

  // Init Speech Recognition (Untuk Fallback Legacy Mode)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "id-ID";
        recognitionRef.current = recognition;
      }
    }
  }, []);

  /**
   * Extract dan separate thinking blocks dari main content
   * Return object { thinking: string, content: string }
   */
  const extractThinkingBlocks = (text) => {
    if (!text) return { thinking: "", content: text };

    let thinking = [];
    let contentLines = [];

    // Split by double newlines untuk process sebagai paragraphs
    const paragraphs = text.split(/\n\s*\n+/);

    const thinkingKeywords = [
      "Crafting", "Refining", "Reflecting", "Planning", "Thinking",
      "Formulating", "Considering", "Analyzing", "Developing", "Creating",
      "Preparing", "Constructing", "Generating", "Composing", "Drafting",
      "Reviewing", "Revising", "Adjusting", "Enhancing", "Optimizing"
    ];

    const keywordPattern = new RegExp(`^\\*\\*(${thinkingKeywords.join("|")})[\\w\\s]*\\*\\*`, "i");

    for (let para of paragraphs) {
      const trimmedPara = para.trim();
      if (keywordPattern.test(trimmedPara)) {
        thinking.push(trimmedPara);
      } else if (trimmedPara.length > 0) {
        contentLines.push(trimmedPara);
      }
    }

    const contentStr = contentLines.join("\n\n");
    // Match both fully closed <thinking>...</thinking> OR unclosed <thinking>... to end of string (for streaming)
    const xmlThinkingPattern = /<thinking>([\s\S]*?)(<\/thinking>|$)/gi;
    
    let finalThinkingStr = thinking.join("\n\n").trim();
    
    const finalContent = contentStr.replace(xmlThinkingPattern, (match, p1) => {
      finalThinkingStr += "\n\n" + p1.trim();
      return "";
    }).trim();

    return {
      thinking: finalThinkingStr.trim(),
      content: finalContent
    };
  };

  /**
   * Extract unique sources from Gemini grounding metadata
   */
  const extractGroundingSources = (metadata) => {
    if (!metadata || !metadata.groundingChunks) return [];

    const sources = [];
    const seenUris = new Set();

    metadata.groundingChunks.forEach(chunk => {
      if (chunk.web && chunk.web.uri && !seenUris.has(chunk.web.uri)) {
        sources.push({
          title: chunk.web.title || "Sumber Informasi",
          url: chunk.web.uri
        });
        seenUris.add(chunk.web.uri);
      }
    });

    return sources;
  };

  const speak = useCallback((text, onEnd) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.(); return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "id-ID";
    utt.onend = () => onEnd?.();
    utt.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utt);
  }, []);

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading || !user) return;
    if (credits < CREDIT_PER_MSG) { alert("Kredit tidak cukup."); return; }

    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user", text: userMsg }];
    setMessages(newMessages);
    
    // Gunakan state manual webSearchActive sebagai penentu mode
    const isSearchNeeded = webSearchActive;

    setLoading(true);
    if (isSearchNeeded) setSearching(true);

    try {
      await deductCredits(user.uid, CREDIT_PER_MSG);

      // Gunakan model grounding (Gemini 2.0) jika mode search aktif
      const targetModel = isSearchNeeded ? MODELS.grounding : MODELS.lite;
      
      // Inject instruksi tambahan jika sedang browsing agar AI tidak cuma "janji"
      const currentSystemInstruction = isSearchNeeded 
        ? `${SYSTEM_INSTRUCTION}\n\nIMPORTANT: Internet access is ENABLED. Use the Google Search tool to provide real-time information.`
        : SYSTEM_INSTRUCTION;

      let streamStarted = false;

      const response = await callGeminiStream({
        history: newMessages,
        systemInstruction: currentSystemInstruction,
        model: targetModel,
        group: CHAT_GROUPS,
        temperature: 0.6,
        thinkingConfig: { thinkingBudget: 0 },
        useSearchGrounding: isSearchNeeded,
        returnMetadata: isSearchNeeded,
        onStream: (chunk) => {
          const { thinking, content } = extractThinkingBlocks(chunk);
          
          if (!streamStarted && content.trim()) {
            streamStarted = true;
            setLoading(false); // Sembunyikan dots setelah teks mulai masuk
          }

          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === "model" && lastMsg.isStreaming) {
              const up = [...prev];
              up[up.length - 1] = {
                ...lastMsg,
                text: content,
                thinking: thinking
              };
              return up;
            } else {
              return [...prev, {
                role: "model",
                text: content,
                thinking: thinking,
                isStreaming: true
              }];
            }
          });
        }
      });

      // Finalize message object with full JSON metadata (sources)
      const aiText = (response && typeof response === "object") ? response.text : (response || "");
      const metadata = (response && typeof response === "object") ? response.groundingMetadata : null;

      const { thinking, content } = extractThinkingBlocks(aiText);
      const sources = extractGroundingSources(metadata);

      setMessages(prev => {
        const up = [...prev];
        const lastIdx = up.length - 1;
        if (up[lastIdx]?.role === "model") {
          up[lastIdx] = {
            role: "model",
            text: content,
            thinking,
            isGrounded: isSearchNeeded,
            sources,
            isStreaming: false
          };
        }
        return up;
      });

      // Reset mode search setelah satu pesan terkirim agar hemat kuota
      setWebSearchActive(false);

    } catch (err) {
      console.error("[ChatDosen] Error:", err);
      // Pesan error ramah pengguna
      setMessages(prev => [...prev, { 
        role: "model", 
        text: "⚠️ Waduh, sepertinya sesi pencarian internet sedang padat atau ada gangguan koneksi. \n\nCoba kirim ulang pesan Anda atau matikan mode pencarian (ikon globe) jika masalah berlanjut ya!" 
      }]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const startCall = async () => {
    if (!user) return;
    if (credits < CREDIT_CALL_START) {
      alert("Kredit tidak cukup untuk memulai panggilan."); return;
    }

    try {
      await deductCredits(user.uid, CREDIT_CALL_START);
    } catch (err) {
      alert(err.message); return;
    }

    setCallActive(true);
    setCallTranscript([]);

    if (useLiveMode) {
      await startGeminiLiveCall();
    } else {
      startLegacyCall();
    }
  };

  /**
   * Start Gemini Live WebSocket Call & Native Microphone Streaming
   */
  const startGeminiLiveCall = async () => {
    try {
      setCallStatus("connecting");

      const wsUrl = getGeminiLiveProxyUrl({ group: CALL_GROUPS });

      const liveClient = new GeminiLiveClient({
        wsUrl,
        voiceName: selectedVoice,
        onMessage: (msg) => {
          setCallTranscript(prev => [...prev, msg]);
        },
        onStatus: (status) => {
          // Menyembunyikan status "thinking" dari UI dengan cara mengabaikannya
          if (status === "thinking") return;
          setCallStatus(status);
        },
        onError: (error) => {
          console.error("[LiveCall] Error:", error);
          setCallStatus("error");
          endCall();
        },
      });

      liveClientRef.current = liveClient;

      await liveClient.connect();
      await startNativeMicrophone(liveClient);

      // Pancingan awal agar AI langsung menyapa
      setTimeout(() => {
        liveClient.sendText("Halo, tolong sapa saya dan perkenalkan dirimu dengan ramah sebagai dosen AI pembimbing saya.");
      }, 500);

    } catch (error) {
      console.error("[StartCall] Failed:", error);
      setCallTranscript(prev => [...prev, {
        role: "model", text: `⚠️ Gagal memulai: ${error.message}`
      }]);
      setCallStatus("error");
    }
  };

  /**
   * Menangkap input microphone murni tanpa VAD manual.
   * Audio murni di stream secara konstan.
   */
  const startNativeMicrophone = async (liveClient) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const float32Data = e.inputBuffer.getChannelData(0);

        // Konversi PCM Float32 ke PCM Int16
        const pcm16 = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
          let s = Math.max(-1, Math.min(1, float32Data[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Encode ke Base64 (lebih stabil memori)
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize));
        }
        const base64Data = btoa(binary);

        // Langsung tembak streaming audio ke Google
        liveClient.sendAudioBase64(base64Data);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      audioProcessorRef.current = { audioCtx, source, processor };

    } catch (err) {
      console.error("Gagal mengakses mikrofon:", err);
      alert("Tidak dapat mengakses mikrofon. Pastikan izin sudah diberikan.");
      throw err;
    }
  };

  /** Legacy Call (Fallback if WebSocket Fails) **/
  const startLegacyCall = async () => {
    const greeting = "Halo. Saya dosen pembimbing AI Anda. Silakan mulai berbicara.";
    setCallTranscript([{ role: "model", text: greeting }]);
    setCallStatus("speaking");
    speak(greeting, () => { startListeningLegacy(); });
  };

  const startListeningLegacy = useCallback(() => {
    if (!recognitionRef.current) return;
    setCallStatus("listening");
    const recognition = recognitionRef.current;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript?.trim();
      if (!transcript) { startListeningLegacy(); return; }

      let history = [];
      setCallTranscript((prev) => { history = [...prev, { role: "user", text: transcript }]; return history; });

      try {
        let aiText = await callGemini({
          history,
          systemInstruction: SYSTEM_INSTRUCTION,
          model: MODELS.primary,
          group: CALL_GROUPS,
          thinkingConfig: { thinkingBudget: 0 },
        });
        // Extract thinking blocks dari response
        const { thinking, content } = extractThinkingBlocks(aiText);
        // For voice call, only speak the main content, not thinking
        setCallTranscript((prev) => [...prev, { role: "model", text: content, thinking }]);
        setCallStatus("speaking");
        speak(content, () => { if (callActive) startListeningLegacy(); });
      } catch (err) {
        setCallStatus("listening");
        setTimeout(() => startListeningLegacy(), 2000);
      }
    };
    try { window.speechSynthesis?.cancel(); recognition.start(); } catch (err) { }
  }, [callActive, speak]);

  const endCall = () => {
    setCallActive(false);
    setCallStatus("idle");

    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }

    if (audioProcessorRef.current) {
      const { audioCtx, source, processor } = audioProcessorRef.current;
      processor.disconnect();
      source.disconnect();
      if (audioCtx.state !== 'closed') audioCtx.close();
      audioProcessorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { }
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    return () => endCall();
  }, []);

  return (
    <div id="chat-container" className="animate-fade-in" style={{ width: "100%", maxWidth: "980px", margin: "0 auto", minHeight: "calc(100vh - 120px)", display: "flex", flexDirection: "column", padding: "0 1rem" }}>

      {/* Inject Keyframes Animasi Soundwave */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes soundWave {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 3s linear infinite;
        }
        .markdown-body {
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .markdown-body p {
          margin-bottom: 0.75rem;
        }
        .markdown-body ul, .markdown-body ol {
          margin-bottom: 1rem;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .markdown-body li {
          margin-bottom: 0.2rem;
          list-style-type: disc;
        }
        .markdown-body strong {
          color: inherit;
          font-weight: 700;
        }
        @media (max-width: 768px) {
          #chat-container { padding: 0 0.4rem !important; }
          #chat-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; margin-top: 0.5rem; }
          #chat-bubble-wrapper { max-width: 95% !important; margin: 0; }
          #chat-form { padding: 0.5rem 0.4rem !important; gap: 0.4rem !important; }
          #chat-input { padding: 0.6rem 0.85rem !important; font-size: 0.85rem !important; }
          #chat-send-btn { width: 38px; height: 38px; }
          .chat-bubble-content { padding: 0.6rem 0.85rem !important; }
          .chat-avatar { width: 28px !important; height: 28px !important; }
          .chat-avatar svg { width: 14px !important; height: 14px !important; }
          .chat-gap { gap: 0.35rem !important; }
        }
      `}} />

      {/* Header UI */}
      <div id="chat-header" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", marginTop: "1rem", flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,0.2)" }}>
          <PremiumIcon name="messageSquare" size={22} style={{ color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700 }}>Chat Dosen AI</h1>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Tanya metodologi, penulisan & analisis
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)", padding: "0.5rem 0.85rem", backgroundColor: "var(--surface-hover)", borderRadius: "24px", flexShrink: 0, fontWeight: 600 }}>
          <PremiumIcon name="coins" size={14} style={{ color: "#F59E0B" }} />
          <span className="hide-mobile">{credits} kredit</span>
          <span className="show-mobile">{credits}</span>
        </div>
      </div>

      {/* Mode Toggle UI */}
      {!callActive && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", padding: "0.4rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-lg)", flexShrink: 0 }}>
          <button
            onClick={() => setMode("chat")}
            style={{
              flex: 1, padding: "0.65rem 0.85rem", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              backgroundColor: mode === "chat" ? "var(--surface)" : "transparent",
              color: mode === "chat" ? "var(--primary)" : "var(--text-muted)",
              boxShadow: mode === "chat" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s"
            }}
          >
            <PremiumIcon name="messageSquare" size={16} />
            <span className="hide-mobile">Chat</span>
          </button>
          <button
            onClick={() => setMode("call")}
            style={{
              flex: 1, padding: "0.65rem 0.85rem", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              backgroundColor: mode === "call" ? "var(--surface)" : "transparent",
              color: mode === "call" ? "#10B981" : "var(--text-muted)",
              boxShadow: mode === "call" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s"
            }}
          >
            <PremiumIcon name="mic" size={16} />
            <span className="hide-mobile">Voice</span>
          </button>
        </div>
      )}

      {/* CHAT MODE */}
      {mode === "chat" && (
        <div className="glass-panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", color: "var(--text-muted)" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(99,102,241,0.1)" }}>
                  <PremiumIcon name="messageSquare" size={28} style={{ color: "var(--primary)" }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "0.95rem", textAlign: "center", maxWidth: "280px", lineHeight: 1.5, color: "var(--text-main)", fontWeight: 500 }}>
                    Mulai percakapan dengan Dosen AI
                  </p>
                  <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Tanyakan seputar skripsi Anda
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const hasThinking = msg.thinking && msg.thinking.length > 0;
              const isExpanded = expandedThinking[`msg-${idx}`];

              return (
                <div key={idx} id="chat-bubble-wrapper" style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                  <div className="chat-gap" style={{
                    display: "flex", gap: "0.5rem",
                    flexDirection: isUser ? "row-reverse" : "row"
                  }}>
                    <div className="chat-avatar" style={{
                      width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: isUser ? "var(--primary)" : "rgba(99,102,241,0.1)",
                      color: isUser ? "white" : "var(--primary)",
                      boxShadow: isUser ? "0 2px 6px rgba(99,102,241,0.2)" : "none",
                      fontSize: "0.7rem"
                    }}>
                      <PremiumIcon name={isUser ? "user" : "sparkles"} size={16} />
                    </div>
                    <div className="chat-bubble-content" style={{
                      padding: "0.75rem 1rem", borderRadius: "14px",
                      borderTopRightRadius: isUser ? "4px" : "14px",
                      borderTopLeftRadius: !isUser ? "4px" : "14px",
                      backgroundColor: isUser ? "var(--primary)" : "var(--surface-hover)",
                      color: isUser ? "white" : "var(--text-main)",
                      boxShadow: isUser ? "0 1px 3px rgba(99,102,241,0.15)" : "none",
                      wordBreak: "break-word"
                    }}>
                      <div className="markdown-body">
                        {isUser ? (
                          <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                        ) : (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        )}
                      </div>

                      {/* Grounding Sources (Citations) */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{
                          marginTop: "0.75rem",
                          paddingTop: "0.6rem",
                          borderTop: "1px solid rgba(99,102,241,0.2)",
                          fontSize: "0.75rem"
                        }}>
                          <p style={{ margin: "0 0 0.4rem 0", fontWeight: 700, opacity: 0.8, color: isUser ? "white" : "var(--primary)" }}>
                            🔗 Referensi:
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                            {msg.sources.map((source, sIdx) => (
                              <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: isUser ? "white" : "var(--primary)",
                                    textDecoration: "underline",
                                    opacity: 0.9,
                                    maxWidth: "180px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  {source.title}
                                </a>
                                {sIdx < msg.sources.length - 1 && (
                                  <span style={{ color: isUser ? "white" : "var(--text-muted)", opacity: 0.5 }}>•</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: "0.8rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PremiumIcon name={searching ? "globe" : "sparkles"} size={18} style={{ color: "var(--primary)" }} className={searching ? "animate-spin-slow" : ""} />
                </div>
                <div style={{ padding: "0.85rem 1.1rem", borderRadius: "16px", borderTopLeftRadius: "4px", backgroundColor: "var(--surface-hover)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {searching && (
                    <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <span className="animate-pulse">🌐 Mencari informasi di internet...</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "var(--text-muted)" }} />
                    <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "var(--text-muted)", animationDelay: "0.15s" }} />
                    <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "var(--text-muted)", animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form id="chat-form" onSubmit={handleSendChat} style={{ padding: "0.85rem 1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.6rem", backgroundColor: "var(--surface)", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setWebSearchActive(!webSearchActive)}
              title={webSearchActive ? "Matikan Pencarian Web" : "Aktifkan Pencarian Web"}
              style={{
                width: "40px", height: "40px", borderRadius: "50%", 
                border: webSearchActive ? "2px solid #4B5563" : "1px solid var(--border)",
                backgroundColor: webSearchActive ? "#4B5563" : "var(--surface-hover)",
                color: webSearchActive ? "white" : "#9CA3AF",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", position: "relative",
                boxShadow: webSearchActive ? "0 0 10px rgba(75, 85, 99, 0.3)" : "none"
              }}
            >
              <PremiumIcon name="globe" size={20} />
            </button>
            
            <input
              id="chat-input"
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder={webSearchActive ? "Cari informasi di internet..." : "Ketik pertanyaan..."}
              style={{
                flex: 1, padding: "0.7rem 1rem", borderRadius: "24px",
                border: "1px solid var(--border)", backgroundColor: "var(--surface-hover)", outline: "none", fontSize: "0.9rem", color: "var(--text-main)"
              }}
            />
            <button
              id="chat-send-btn"
              type="submit" disabled={!input.trim() || loading}
              style={{
                width: "40px", height: "40px", borderRadius: "50%", border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                backgroundColor: input.trim() ? "var(--primary)" : "var(--surface-hover)", color: input.trim() ? "white" : "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: input.trim() ? "0 2px 8px rgba(99,102,241,0.2)" : "none", transition: "all 0.2s"
              }}
            >
              <PremiumIcon name="send" size={18} />
            </button>
          </form>
        </div>
      )}

      {/* CALL MODE (START SCREEN) */}
      {mode === "call" && !callActive && (
        <div className="glass-panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.75rem", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(16,185,129,0.3)", boxShadow: "0 4px 12px rgba(16,185,129,0.1)" }}>
            <PremiumIcon name="mic" size={40} style={{ color: "#10B981" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem", fontWeight: 700 }}>Voice Call Dosen AI</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0, maxWidth: "340px", lineHeight: 1.5 }}>
              Berbicara langsung dengan Skripzy AI menggunakan suara pilihan Anda
            </p>
          </div>

          <div style={{ padding: "1.25rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-lg)", maxWidth: "100%", width: "100%" }}>
            <button
              onClick={() => setExpandedVoiceOptions(!expandedVoiceOptions)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-main)",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            >
              <span>{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.label || "Pilih Suara"}</span>
              <PremiumIcon name={expandedVoiceOptions ? "chevronDown" : "chevronRight"} size={18} style={{ transform: expandedVoiceOptions ? "rotate(0deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>

            {expandedVoiceOptions && (
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "220px", overflowY: "auto" }}>
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      setExpandedVoiceOptions(false);
                    }}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      border: selectedVoice === voice.id ? "2px solid var(--primary)" : "1px solid var(--border)",
                      backgroundColor: selectedVoice === voice.id ? "rgba(99,102,241,0.1)" : "var(--surface-hover)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.2rem"
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{voice.label}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{voice.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={startCall} disabled={credits < CREDIT_CALL_START} style={{ padding: "0.85rem 2rem", borderRadius: "50px", border: "none", cursor: credits >= CREDIT_CALL_START ? "pointer" : "not-allowed", background: "linear-gradient(135deg, #10B981, #059669)", color: "white", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.6rem", boxShadow: "0 6px 20px rgba(16,185,129,0.3)", opacity: credits >= CREDIT_CALL_START ? 1 : 0.5, transition: "all 0.2s" }}>
            <PremiumIcon name="mic" size={18} /> Mulai Panggilan
          </button>
        </div>
      )}

      {/* CALL MODE (ACTIVE SCREEN) */}
      {mode === "call" && callActive && (
        <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: "1rem" }}>

          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface)", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  backgroundColor: callStatus === "listening" ? "#10B981" : callStatus === "speaking" ? "#6366F1" : callStatus === "connecting" ? "#3B82F6" : "#9CA3AF"
                }} className={callStatus !== "idle" && callStatus !== "error" ? "animate-pulse" : ""} />

                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                  {callStatus === "connecting" && "🔌 Menghubungkan..."}
                  {callStatus === "listening" && "🎤 Silakan bicara..."}
                  {callStatus === "speaking" && "🔊 AI sedang berbicara..."}
                  {callStatus === "error" && "❌ Error"}
                  {callStatus === "idle" && "Panggilan selesai"}
                </span>
              </div>
            </div>
            <button onClick={endCall} style={{ padding: "0.4rem 1rem", borderRadius: "20px", border: "none", cursor: "pointer", backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.2s" }}>
              <PremiumIcon name="x" size={14} /> Akhiri
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
            {callStatus === "speaking" && (
              <div style={{ display: "flex", gap: "5px", alignItems: "center", height: "40px" }}>
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "8px",
                      backgroundColor: "#6366F1",
                      borderRadius: "4px",
                      animation: `soundWave 1s infinite ease-in-out ${i * 0.15}s`,
                      height: "8px"
                    }}
                  />
                ))}
              </div>
            )}
            {callStatus === "listening" && (
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                <p style={{ fontSize: "0.9rem", margin: "0 0 0.4rem", fontWeight: 500 }}>🎤 Anda sedang berbicara</p>
                <p style={{ fontSize: "0.75rem", margin: 0, maxWidth: "280px" }}>Suara Anda diproses oleh AI</p>
              </div>
            )}
            {callStatus === "connecting" && (
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                <p style={{ fontSize: "0.9rem", margin: 0, fontWeight: 500 }}>🔌 Menghubungkan...</p>
              </div>
            )}
            <div ref={callEndRef} />
          </div>

          {/* Audio Indicator Section */}
          <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", backgroundColor: "var(--surface)" }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: callStatus === "listening" ? "rgba(16,185,129,0.15)" : callStatus === "speaking" ? "rgba(99,102,241,0.15)" : "var(--surface-hover)",
              transition: "all 0.3s",
              boxShadow: callStatus === "listening" ? "0 4px 12px rgba(16,185,129,0.1)" : callStatus === "speaking" ? "0 4px 12px rgba(99,102,241,0.1)" : "none"
            }}>
              <PremiumIcon
                name={callStatus === "listening" ? "mic" : "radio"}
                size={32}
                style={{
                  color: callStatus === "listening" ? "#10B981" : "#9CA3AF",
                  opacity: callStatus === "speaking" ? 0.4 : 1,
                  filter: callStatus === "speaking" ? "blur(0.5px)" : "none",
                  transition: "all 0.3s",
                  pointerEvents: callStatus === "speaking" ? "none" : "auto"
                }}
              />

            </div>
          </div>

        </div>
      )}
    </div>
  );
}