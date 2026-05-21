"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGemini } from "@/lib/callWorker";
import { deductCredits } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

const SIDANG_MODEL = "gemini-flash-lite-latest";
const ID_SPEECH_LANG = "id-ID";

const DOSEN_PROFILES = [
  { id: "killer", label: "Dosen Killer", desc: "Sangat kritis, to the point, mencari kelemahan.", temp: 0.2 },
  { id: "kritis", label: "Dosen Sedang (Kritis)", desc: "Logis, menguji metodologi dan dasar teori dengan tajam.", temp: 0.4 },
  { id: "santai", label: "Dosen Sedang (Santai)", desc: "Ramah, namun tetap bertanya seputar esensi penelitian.", temp: 0.7 },
  { id: "suportif", label: "Dosen Suportif", desc: "Menggiring opini, membimbing memberikan saran perbaikan.", temp: 0.8 },
];

const PROFILE_ACCENTS = {
  killer: "#EF4444",
  kritis: "#4F46E5",
  santai: "#0EA5E9",
  suportif: "#10B981",
};

const PROFILE_TTS = {
  killer: { rate: 0.9, pitch: 0.82 },
  kritis: { rate: 0.92, pitch: 0.96 },
  santai: { rate: 0.94, pitch: 1.02 },
  suportif: { rate: 0.93, pitch: 1.08 },
};

function combineTranscript(base, spoken, interim = "") {
  return [base, spoken, interim].map(part => part.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
}

function sanitizeSpeechText(text) {
  return String(text || "")
    .replace(/[#*_`>-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreVoice(voice) {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const lang = (voice.lang || "").toLowerCase();
  let score = 0;

  if (lang === "id-id") score += 100;
  else if (lang.startsWith("id")) score += 80;
  if (/natural|neural|online|premium/.test(name)) score += 28;
  if (/google|microsoft|edge/.test(name)) score += 22;
  if (/gadis|damayanti|ardi|indonesia|indonesian/.test(name)) score += 12;
  if (voice.localService === false) score += 6;

  return score;
}

function getBestIndonesianVoice(voices) {
  return [...voices]
    .filter(voice => (voice.lang || "").toLowerCase().startsWith("id"))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

function readPersistedSidangState() {
  const defaults = {
    isSessionActive: false,
    skripsiTitle: "",
    dosenProfile: "kritis",
    sidangMode: "skripsi",
    sessionInsight: null,
    docName: "",
    questionCount: 0,
    sanggahanCount: 0,
    maxQuestions: 10,
    maxSanggahan: 0,
    isFinished: false,
    messages: [],
  };

  if (typeof window === "undefined") return defaults;

  const saved = sessionStorage.getItem("simulasi_sidang_state");
  if (!saved) return defaults;

  try {
    const parsed = JSON.parse(saved);
    if (!parsed?.isSessionActive) return defaults;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export default function SimulasiSidangPage() {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const credits = userData?.credits ?? 0;
  const plan = userData?.plan || "free";
  const sessionCost = toolMap["simulasi-sidang"]?.creditCost ?? 5;
  const initialSession = useMemo(() => readPersistedSidangState(), []);

  // Setup State
  const [isSessionActive, setIsSessionActive] = useState(initialSession.isSessionActive);
  const [skripsiTitle, setSkripsiTitle] = useState(initialSession.skripsiTitle);
  const [dosenProfile, setDosenProfile] = useState(initialSession.dosenProfile);
  const [sidangMode, setSidangMode] = useState(initialSession.sidangMode);

  // Document State
  const [extractionStatus, setExtractionStatus] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [sessionInsight, setSessionInsight] = useState(initialSession.sessionInsight);
  const [docName, setDocName] = useState(initialSession.docName);

  // Session Limits & Tracking
  const [questionCount, setQuestionCount] = useState(initialSession.questionCount);
  const [sanggahanCount, setSanggahanCount] = useState(initialSession.sanggahanCount);
  const [maxQuestions, setMaxQuestions] = useState(initialSession.maxQuestions);
  const [maxSanggahan, setMaxSanggahan] = useState(initialSession.maxSanggahan);
  const [isFinished, setIsFinished] = useState(initialSession.isFinished);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  // Chat State
  const [messages, setMessages] = useState(initialSession.messages);
  const [currentInput, setCurrentInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Speech State
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const shouldKeepListeningRef = useRef(false);
  const recordingBaseRef = useRef("");
  const liveTranscriptRef = useRef("");
  const restartTimerRef = useRef(null);
  const chatEndRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isSessionActive) {
      sessionStorage.setItem("simulasi_sidang_state", JSON.stringify({
        isSessionActive, skripsiTitle, dosenProfile, sidangMode, sessionInsight, docName,
        questionCount, sanggahanCount, maxQuestions, maxSanggahan, isFinished, messages
      }));
    } else {
      sessionStorage.removeItem("simulasi_sidang_state");
    }
  }, [isSessionActive, skripsiTitle, dosenProfile, sidangMode, sessionInsight, docName, questionCount, sanggahanCount, maxQuestions, maxSanggahan, isFinished, messages]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Init Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = ID_SPEECH_LANG;
        recognitionRef.current.onresult = (event) => {
          let finalText = "";
          let interimText = "";

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) finalText += ` ${transcript}`;
            else interimText += ` ${transcript}`;
          }

          if (finalText.trim()) {
            liveTranscriptRef.current = combineTranscript(liveTranscriptRef.current, finalText);
          }

          setCurrentInput(combineTranscript(recordingBaseRef.current, liveTranscriptRef.current, interimText));
        };
        recognitionRef.current.onerror = (event) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            shouldKeepListeningRef.current = false;
          }
          setIsRecording(false);
        };
        recognitionRef.current.onend = () => {
          if (shouldKeepListeningRef.current) {
            restartTimerRef.current = window.setTimeout(() => {
              try {
                recognitionRef.current?.start();
                setIsRecording(true);
              } catch {
                setIsRecording(false);
              }
            }, 250);
            return;
          }
          setIsRecording(false);
        };
      } else {
        window.setTimeout(() => setSpeechSupported(false), 0);
      }
    }

    return () => {
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      recognitionRef.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const syncVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      setSelectedVoiceURI(current => current || getBestIndonesianVoice(voices)?.voiceURI || "");
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === syncVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  // 2. TTS DENGAN SPEECH SYNTHESIS (NATIVE BROWSER OPTIMIZED)
  const speak = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    
    // Matikan audio puter jika masih ada yang tersisa
    if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio.currentTime = 0;
    }

    const utterance = new SpeechSynthesisUtterance(sanitizeSpeechText(text));
    const ttsProfile = PROFILE_TTS[dosenProfile] || PROFILE_TTS.kritis;
    utterance.lang = ID_SPEECH_LANG;
    utterance.rate = ttsProfile.rate;
    utterance.pitch = ttsProfile.pitch;
    utterance.volume = 1;

    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const bestVoice = voices.find(v => v.voiceURI === selectedVoiceURI) || getBestIndonesianVoice(voices);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  };

  // 3. DOCUMENT EXTRACTION (PDF & WORD) CLIENT-SIDE
  const extractPDF = async (file) => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    const maxPages = Math.min(pdf.numPages, 100); // Batasi 100 halaman untuk hemat memory
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(" ") + "\n";
    }
    return text;
  };

  const extractWord = async (file) => {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const cleanText = (text) => {
    return text.replace(/\r/g, "").replace(/\n{2,}/g, "\n").replace(/\s{2,}/g, " ").replace(/Halaman\s*\d+/gi, "");
  };

  const buildContext = (rawText) => {
    setExtractionStatus("Memisahkan Bab & Filter Teks (Client-Side)...");
    const cleaned = cleanText(rawText);

    const parts = cleaned.split(/(?=BAB\s+[IVXLC]+|CHAPTER\s+[IVXLC]+)/i);
    if (parts.length < 2) return cleaned.split(" ").slice(0, 4000).join(" "); // Fallback

    let finalContext = "";
    parts.forEach((part, index) => {
      if (index === 0) {
        finalContext += "\n[ABSTRAK]\n" + part.slice(0, 3000);
      } else if (index === 1 || index === parts.length - 1) {
        finalContext += `\n[BAB]\n` + part.slice(0, 4000); // Ambil full Bab 1 & Kesimpulan (limit 4k char)
      } else {
        const paragraphs = part.split(/\n+/).map(p => p.trim()).filter(p => p.length > 80);
        const keywords = ["tujuan", "masalah", "metode", "penelitian", "hasil", "analisis", "kesimpulan", "kerangka"];

        const head = paragraphs.slice(0, 2);
        const tail = paragraphs.slice(-2);
        const important = paragraphs.filter(p => keywords.some(k => p.toLowerCase().includes(k)));
        const top = [...paragraphs].sort((a, b) => b.length - a.length).slice(0, 3);

        const combined = [...new Set([...head, ...important.slice(0, 3), ...top, ...tail])];
        finalContext += `\n[BAB RINGKAS]\n` + combined.join("\n\n");
      }
    });
    return finalContext;
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".docx")) {
      alert("Hanya file PDF atau Word (.docx) yang didukung.");
      return;
    }

    setSetupLoading(true);
    setSetupError("");
    setDocName(file.name);
    setSessionInsight(null);

    try {
      setExtractionStatus("Mengekstrak teks dokumen...");
      let rawText = "";
      if (file.type === "application/pdf") rawText = await extractPDF(file);
      else rawText = await extractWord(file);

      const contextText = buildContext(rawText);

      setExtractionStatus("Meringkas Insight dengan AI (One-time call)...");
      const prompt = `Buatkan ringkasan wawasan penelitian dari draf dokumen ini untuk digunakan sebagai "otak" bagi Dosen Penguji.
Kembalikan dalam format JSON murni tanpa markdown, dengan struktur:
{"bab_summary": {"pendahuluan": "...", "teori_metode": "...", "hasil_kesimpulan": "..."}, "insight": {"tujuan": "...", "metode": "...", "hasil": "...", "kelemahan": ["...", "..."]}}

Teks Dokumen (Telah difilter):
${contextText.slice(0, 20000)}
`;

      const aiResponse = await callGemini({
        prompt,
        model: SIDANG_MODEL,
        temperature: 0.2, // Low temp for extraction JSON
      });

      const jsonStr = aiResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
      const insightObj = JSON.parse(jsonStr);

      setSessionInsight(insightObj);
      setExtractionStatus("Dokumen siap!");
      setTimeout(() => setExtractionStatus(""), 2000);

    } catch (err) {
      console.error(err);
      setSetupError("Gagal memproses dokumen. Pastikan dokumen bisa dibaca.");
      setDocName("");
      setExtractionStatus("");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!skripsiTitle.trim()) { setSetupError("Judul penelitian wajib diisi."); return; }
    if (credits < sessionCost) { setSetupError(`Kredit tidak cukup. Butuh ${sessionCost} credit.`); return; }

    setSetupLoading(true);
    setSetupError("");
    setExtractionStatus("Menyiapkan ruang sidang, harap tunggu...");

    try {
      await deductCredits(user.uid, sessionCost);

      // 4. ATURAN SIDANG (DOSEN & TIPE)
      let mq = 10;
      let ms = 5;

      if (sidangMode === "proposal") {
        mq = 7;
        if (dosenProfile === "suportif") ms = 0;
        else if (dosenProfile === "killer") ms = 7;
        else ms = 3;
      } else {
        mq = 10;
        if (dosenProfile === "suportif") ms = 2;
        else if (dosenProfile === "killer") ms = 10;
        else ms = 5;
      }

      setMaxQuestions(mq);
      setMaxSanggahan(ms);
      setQuestionCount(1);
      setSanggahanCount(0);
      setIsFinished(false);

      const profileInfo = DOSEN_PROFILES.find(p => p.id === dosenProfile);

      let systemInstruction = `Kamu adalah dosen penguji sidang ${sidangMode}. Karaktermu: ${profileInfo.label} (${profileInfo.desc}). 
Mahasiswa sedang sidang dengan judul: "${skripsiTitle}".`;

      if (sessionInsight) {
        systemInstruction += `\n\nPengetahuan kamu tentang penelitian ini:
${JSON.stringify(sessionInsight)}
Gunakan insight ini untuk bertanya spesifik.`;
      }

      systemInstruction += `\n\nAturan:
1. Mulai dengan sapaan singkat dan berikan Pertanyaan Utama 1.
2. Selalu balas layaknya obrolan lisan nyata (singkat, 2-3 kalimat max).
3. Kembalikan HANYA JSON MURNI tanpa markdown, dengan format: {"type": "pertanyaan", "message": "pesan lisan kamu"}`;

      const aiResponseJSON = await callGemini({
        prompt: "Halo Bapak/Ibu dosen penguji, saya siap untuk memulai presentasi/sidang.",
        systemInstruction: systemInstruction,
        model: SIDANG_MODEL,
        temperature: profileInfo.temp,
        responseMimeType: "application/json"
      });

      let responseObj = { message: "Maaf, terjadi kesalahan." };
      try {
        responseObj = JSON.parse(aiResponseJSON.replace(/```json/gi, "").replace(/```/g, "").trim());
      } catch (e) { responseObj.message = aiResponseJSON; }

      setMessages([{ role: "model", text: responseObj.message }]);
      setIsSessionActive(true);
      speak(responseObj.message);

    } catch (err) {
      setSetupError(err.message || "Gagal memulai sesi sidang.");
    } finally {
      setSetupLoading(false);
      setExtractionStatus("");
    }
  };

  const startListening = () => {
    if (!recognitionRef.current || chatLoading || isFinished) return;

    if (window.currentAudio) window.currentAudio.pause();
    window.speechSynthesis?.cancel?.();

    recordingBaseRef.current = currentInput.trim();
    liveTranscriptRef.current = "";
    shouldKeepListeningRef.current = true;

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch {
      setIsRecording(true);
    }
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop?.();
    setIsRecording(false);
  };

  const handleInputChange = (value) => {
    setCurrentInput(value);
    if (isRecordingRef.current) {
      recordingBaseRef.current = value.trim();
      liveTranscriptRef.current = "";
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!currentInput.trim() || chatLoading || isFinished) return;

    const userMessage = currentInput.trim();
    stopListening();
    setCurrentInput("");
    if (window.currentAudio) window.currentAudio.pause();
    window.speechSynthesis?.cancel?.();

    const newHistory = [...messages, { role: "user", text: userMessage }];
    setMessages(newHistory);
    setChatLoading(true);

    try {
      const profileInfo = DOSEN_PROFILES.find(p => p.id === dosenProfile);
      let currentQ = questionCount;
      let currentS = sanggahanCount;

      let stateInstructions = `\n\nStatus Sidang:
- Topik Pertanyaan Utama yang sudah diajukan: ${currentQ} dari maksimal ${maxQuestions}
- Sanggahan yang sudah dipakai: ${currentS} dari maksimal ${maxSanggahan}`;

      if (currentQ >= maxQuestions) {
        stateInstructions += `\n\nINSTRUKSI FINAL: Kuota pertanyaan utama sudah habis. Akhiri sidang sekarang juga. Jangan bertanya lagi. Wajib gunakan type "penutup" dan nyatakan bahwa sidang selesai.`;
      } else {
        stateInstructions += `\n\nINSTRUKSI TINDAKAN (PILIH SALAH SATU):
1. "pertanyaan": Berikan apresiasi jika jawaban mahasiswa memuaskan, lalu ajukan Topik Pertanyaan Utama ke-${currentQ + 1} yang diambil dari konteks skripsi atau mengaitkan bab metodologi dengan jawaban user sebelumnya.
2. "sanggahan": Jika jawaban mahasiswa lemah, membingungkan, dan kuota sanggahan (${currentS}/${maxSanggahan}) masih ada, serang/sanggah kelemahan jawabannya tadi tanpa berpindah topik pertanyaan.
3. "penutup": Jika kamu merasa sidang sudah cukup, gunakan ini untuk menutup sidang.`;
      }

      let systemInstruction = `Kamu adalah dosen penguji sidang ${sidangMode}. Karaktermu: ${profileInfo.label}. Judul mahasiswa: "${skripsiTitle}".`;
      if (sessionInsight) systemInstruction += `\nInsight Dokumen: ${JSON.stringify(sessionInsight)}`;
      systemInstruction += stateInstructions;
      systemInstruction += `\n\nSelalu respon maksimal 3 kalimat secara lisan alamiah. KEMBALIKAN HANYA JSON MURNI dengan format:
{
  "type": "pertanyaan" | "sanggahan" | "penutup",
  "message": "pesan lisan kamu yang akan diucapkan ke mahasiswa"
}`;

      const aiResponseJSON = await callGemini({
        history: newHistory,
        systemInstruction: systemInstruction,
        model: SIDANG_MODEL,
        temperature: profileInfo.temp,
        responseMimeType: "application/json"
      });

      let responseObj = { type: "pertanyaan", message: "Maaf, terjadi kesalahan dari AI." };
      try {
        responseObj = JSON.parse(aiResponseJSON.replace(/```json/gi, "").replace(/```/g, "").trim());
      } catch (e) { responseObj.message = aiResponseJSON; }

      // Update turn counts dynamically
      if (responseObj.type === "pertanyaan") {
        setQuestionCount(prev => prev + 1);
      } else if (responseObj.type === "sanggahan") {
        setSanggahanCount(prev => prev + 1);
      } else if (responseObj.type === "penutup" || currentQ >= maxQuestions) {
        setIsFinished(true);
      }

      setMessages(prev => [...prev, { role: "model", text: responseObj.message }]);
      speak(responseObj.message);

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const generateFinalScoring = async () => {
    stopListening();
    if (window.currentAudio) window.currentAudio.pause();
    window.speechSynthesis?.cancel?.();
    setChatLoading(true);

    try {
      const prompt = `Sidang telah selesai. Berdasarkan riwayat percakapan kita tadi, tolong berikan penilaian jujur dan komprehensif.
Gunakan format Markdown persis seperti ini:

### 📊 Evaluasi Sidang
- **Kekuatan Utama:** [Tulis 1-2 kalimat]
- **Kelemahan Terbesar:** [Tulis 1-2 kalimat area yang kurang dikuasai mahasiswa]
- **Saran Perbaikan (Revisi):** [Tulis 1-2 kalimat rekomendasi perbaikan skripsi]

### 🏆 Skor Akhir
- **Pemahaman Materi:** [Angka 0-100]
- **Kemampuan Defend/Menjawab:** [Angka 0-100]
- **Nilai Prediksi:** [A/B/C/D]

Sajikan dengan gaya bahasa akademis namun membangun (konstruktif).`;

      const aiResponse = await callGemini({
        history: messages,
        prompt: prompt,
        model: SIDANG_MODEL,
        temperature: 0.4,
      });

      setMessages(prev => [...prev, { role: "model", text: aiResponse }]);
    } catch (err) {
      alert("Gagal memuat kesimpulan: " + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const confirmEndSession = () => {
    if (window.confirm("Apakah Anda yakin ingin mengakhiri sesi sidang ini? Riwayat obrolan akan dihapus setelah Anda keluar.")) {
      stopListening();
      if (window.currentAudio) window.currentAudio.pause();
      window.speechSynthesis?.cancel?.();
      sessionStorage.removeItem("simulasi_sidang_state");
      setIsSessionActive(false);
      setMessages([]);
      setSessionInsight(null);
      setDocName("");
      setQuestionCount(0);
      setSanggahanCount(0);
      setIsFinished(false);
      setShowConfirmEnd(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (setupLoading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate an input change event
      const fakeEvent = { target: { files: [file] } };
      handleDocumentUpload(fakeEvent);
    }
  };

  const activeProfile = DOSEN_PROFILES.find(p => p.id === dosenProfile) || DOSEN_PROFILES[1];
  const accentColor = PROFILE_ACCENTS[dosenProfile] || "var(--primary)";
  const idVoices = availableVoices.filter(voice => (voice.lang || "").toLowerCase().startsWith("id"));
  const questionProgress = maxQuestions ? Math.min((questionCount / maxQuestions) * 100, 100) : 0;
  const sanggahanProgress = maxSanggahan ? Math.min((sanggahanCount / maxSanggahan) * 100, 100) : 0;
  const canStartSession = !setupLoading && Boolean(skripsiTitle.trim()) && plan !== "free";

  return (
    <div className="animate-fade-in" style={{ maxWidth: isSessionActive ? "1120px" : "920px", margin: "0 auto", paddingBottom: isMobile ? "2rem" : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {isSessionActive ? (
            <button onClick={() => setShowConfirmEnd(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }} title="Keluar">
              <PremiumIcon name="arrowLeft" size={20} />
            </button>
          ) : (
            <Link href="/dashboard" style={{ color: "var(--text-muted)" }}><PremiumIcon name="arrowLeft" size={20} /></Link>
          )}
          <div>
            <h1 style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", margin: 0 }}>Simulasi Sidang AI</h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Latihan defend skripsi dengan Dosen AI</p>
          </div>
        </div>
        {!isSessionActive && (
          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.85rem", backgroundColor: "rgba(236, 72, 153, 0.1)", borderRadius: "var(--radius-lg)", fontSize: "0.75rem", fontWeight: 600, color: "#DB2777" }}>
            <PremiumIcon name="barChart" size={14} />
            <span>{sessionCost} credit</span>
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
        <div className={isMobile ? "native-card" : "glass-panel"} style={{ margin: isMobile ? "0 -0.75rem" : 0, padding: isMobile ? undefined : "1.5rem" }}>
          <form onSubmit={handleStartSession}>
            <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "1rem", flexDirection: isMobile ? "column" : "row", marginBottom: "1.4rem" }}>
              <div>
                <h2 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", margin: "0 0 0.25rem" }}>Persiapan Sidang</h2>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>Atur konteks, unggah dokumen, lalu mulai sesi tanya jawab.</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.38rem 0.65rem", borderRadius: "999px", background: "rgba(79,70,229,0.1)", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 700 }}>
                  <PremiumIcon name="clock" size={13} /> 10-15 menit
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.38rem 0.65rem", borderRadius: "999px", background: "rgba(16,185,129,0.1)", color: "var(--success)", fontSize: "0.72rem", fontWeight: 700 }}>
                  <PremiumIcon name="shield" size={13} /> Ephemeral
                </span>
              </div>
            </div>

            {setupError && (
              <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem" }}>
                {setupError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Jenis Sidang & Karakter Dosen</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                {["proposal", "skripsi"].map(mode => (
                  <button
                    key={mode} type="button" onClick={() => setSidangMode(mode)} disabled={plan === "free"}
                    style={{
                      textAlign: "left", padding: "0.9rem", borderRadius: "10px",
                      border: sidangMode === mode ? `2px solid ${accentColor}` : "1px solid var(--border)",
                      backgroundColor: sidangMode === mode ? "rgba(79,70,229,0.07)" : "var(--surface)",
                      cursor: plan === "free" ? "not-allowed" : "pointer", opacity: plan === "free" ? 0.6 : 1,
                      fontWeight: 700, color: sidangMode === mode ? accentColor : "var(--text-main)", fontSize: isMobile ? "0.83rem" : "0.92rem",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.55rem"
                    }}
                  >
                    📋 Sidang {mode === "proposal" ? "Proposal" : "Skripsi"}
                  </button>
                ))}
              </div>
              <select className="form-input" value={dosenProfile} onChange={e => setDosenProfile(e.target.value)} disabled={plan === "free"}>
                {DOSEN_PROFILES.map(p => (
                  <option key={p.id} value={p.id}>{p.label} - {p.desc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Judul Lengkap</label>
              <textarea
                className="form-input" rows="2"
                placeholder="Contoh: Pengaruh Algoritma Rekomendasi Terhadap Keputusan..."
                value={skripsiTitle} onChange={e => setSkripsiTitle(e.target.value)} disabled={plan === "free"}
              />
            </div>

            {/* Document Upload Drag & Drop */}
            <div className="form-group">
              <label className="form-label">Upload Dokumen (Wajib PDF / Word)</label>
              <label
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "2rem 1rem", border: "2px dashed var(--border)", borderRadius: "8px",
                  cursor: setupLoading ? "not-allowed" : "pointer",
                  backgroundColor: docName ? "rgba(16, 185, 129, 0.05)" : "var(--surface-hover)",
                  gap: "0.5rem", textAlign: "center", opacity: setupLoading ? 0.6 : 1, transition: "all 0.2s"
                }}>
                {docName ? (
                  <>
                    <PremiumIcon name="checkCircle" size={24} style={{ color: "var(--success)" }} />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600 }}>{docName}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--success)" }}>Ekstraksi berhasil. Dosen siap menguji isi dokumen ini!</span>
                  </>
                ) : (
                  <>
                    {setupLoading ? <LoadingSpinner size={32} className="text-primary" /> : <PremiumIcon name="uploadCloud" size={28} style={{ color: "var(--text-muted)" }} />}
                    <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{setupLoading ? "Memproses Dokumen..." : "Drag & Drop File PDF/Word Kesini"}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", opacity: 0.7 }}>Atau klik untuk memilih file (.pdf, .docx)</span>
                  </>
                )}
                <input type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={handleDocumentUpload} disabled={setupLoading} />
              </label>

              {/* Dynamic Extraction Label */}
              {extractionStatus && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem", textAlign: "center", backgroundColor: "rgba(79, 70, 229, 0.1)", borderRadius: "4px", fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                  <LoadingSpinner size={12} className="text-primary" />
                  {extractionStatus}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" style={{ background: `linear-gradient(135deg, ${accentColor}, #BE185D)` }} disabled={!canStartSession}>
                {setupLoading ? <><LoadingSpinner size={18} className="text-white" /> Memuat...</> : "Mulai Simulasi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHAT/SESSION PHASE */}
      {isSessionActive && (
        <div className={isMobile ? "native-card" : "glass-panel"} style={{ display: "flex", flexDirection: "column", height: isMobile ? "calc(100vh - 165px)" : "72vh", minHeight: isMobile ? "560px" : "640px", margin: isMobile ? "0 -0.75rem" : 0, overflow: "hidden" }}>

          <div style={{ padding: isMobile ? "0.75rem 1rem" : "1rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(236,72,153,0.02)" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                {sidangMode} • Q: {questionCount}/{maxQuestions} • S: {sanggahanCount}/{maxSanggahan}
              </div>
              <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.95rem" }}>{activeProfile.label}</div>
            </div>
            {isFinished ? (
              <button onClick={generateFinalScoring} disabled={chatLoading} className="btn btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", background: "linear-gradient(135deg, #10B981, #059669)" }}>
                Lihat Evaluasi Akhir
              </button>
            ) : (
              <button onClick={() => setShowConfirmEnd(true)} className="btn btn-outline" style={{ borderColor: "var(--danger)", color: "var(--danger)", padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
                Akhiri Sidang
              </button>
            )}
          </div>

          <div style={{ padding: isMobile ? "0.75rem 1rem" : "0.85rem 1.5rem", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: "0.85rem", alignItems: "center", backgroundColor: "rgba(79,70,229,0.035)" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.35rem" }}>
                  <span>Pertanyaan</span>
                  <span>{questionCount}/{maxQuestions}</span>
                </div>
                <div style={{ height: 7, borderRadius: "999px", background: "var(--surface-hover)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${questionProgress}%`, background: accentColor, borderRadius: "999px", transition: "width 0.25s ease" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.35rem" }}>
                  <span>Sanggahan</span>
                  <span>{sanggahanCount}/{maxSanggahan}</span>
                </div>
                <div style={{ height: 7, borderRadius: "999px", background: "var(--surface-hover)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${sanggahanProgress}%`, background: "var(--danger)", borderRadius: "999px", transition: "width 0.25s ease" }} />
                </div>
              </div>
            </div>
            {idVoices.length > 0 && (
              <select
                value={selectedVoiceURI}
                onChange={e => setSelectedVoiceURI(e.target.value)}
                className="form-input"
                style={{ width: isMobile ? "100%" : "230px", padding: "0.42rem 0.65rem", fontSize: "0.75rem", backgroundColor: "var(--surface)" }}
                title="Pilih suara TTS browser"
              >
                {idVoices.map(voice => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ flex: 1, padding: isMobile ? "1rem" : "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: isMobile ? "1rem" : "1.25rem" }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div key={idx} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "80%", display: "flex", gap: "0.75rem", flexDirection: isUser ? "row-reverse" : "row" }}>
                  <div style={{ width: isMobile ? "30px" : "36px", height: isMobile ? "30px" : "36px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isUser ? "var(--primary-light)" : "var(--surface-hover)", color: isUser ? "var(--primary)" : "var(--text-muted)" }}>
                    <PremiumIcon name={isUser ? "user" : "mic"} size={isMobile ? 16 : 18} />
                  </div>
                  <div style={{ backgroundColor: isUser ? "var(--primary)" : "var(--surface-hover)", color: isUser ? "#fff" : "var(--text-main)", padding: isMobile ? "0.65rem 1rem" : "0.85rem 1.25rem", borderRadius: "16px", borderTopRightRadius: isUser ? 0 : "16px", borderTopLeftRadius: !isUser ? 0 : "16px", lineHeight: 1.5, fontSize: isMobile ? "0.875rem" : "0.95rem" }}>
                    {isUser ? msg.text : (
                      <div className="markdown-body" style={{ color: "inherit" }}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: "0.75rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LoadingSpinner size={20} className="text-primary" />
                </div>
                <div style={{ padding: "0.85rem 1.25rem", borderRadius: "16px", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Dosen sedang mengetik...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {!isFinished && (
            <div style={{ padding: isMobile ? "0.75rem" : "1rem", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.65rem", alignItems: "end", backgroundColor: "rgba(var(--surface-rgb), 0.86)" }}>
              <button
                type="button"
                onClick={() => { if (isRecording) stopListening(); else startListening(); }}
                disabled={!speechSupported || chatLoading}
                style={{ width: isMobile ? "42px" : "50px", height: isMobile ? "42px" : "50px", borderRadius: "50%", border: isRecording ? "1px solid rgba(239,68,68,0.35)" : "1px solid var(--border)", cursor: speechSupported && !chatLoading ? "pointer" : "not-allowed", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isRecording ? "rgba(239,68,68,0.12)" : "var(--surface-hover)", color: isRecording ? "var(--danger)" : "var(--text-muted)", transition: "all 0.2s", boxShadow: isRecording ? "0 0 0 6px rgba(239,68,68,0.08)" : "none" }}
                title={speechSupported ? "Gunakan mikrofon" : "Speech recognition tidak didukung browser ini"}
              >
                {isRecording ? <PremiumIcon name="radio" size={isMobile ? 20 : 23} /> : <PremiumIcon name="mic" size={isMobile ? 20 : 23} />}
              </button>
              <div style={{ backgroundColor: "var(--surface)", border: isRecording ? "1px solid rgba(239,68,68,0.35)" : "1px solid var(--border)", borderRadius: "18px", padding: "0.55rem 0.8rem 0.35rem", display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 0 }}>
                <textarea
                  value={currentInput}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder={isRecording ? "Mic aktif. Teks muncul realtime dan tetap bisa diedit..." : "Jawab pertanyaan dosen..."}
                  rows={isMobile ? 2 : 1}
                  style={{ width: "100%", minHeight: isMobile ? "44px" : "28px", maxHeight: "120px", resize: "vertical", background: "transparent", border: "none", outline: "none", color: "var(--text-main)", fontFamily: "inherit", fontSize: isMobile ? "0.875rem" : "0.95rem", lineHeight: 1.45 }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.68rem", color: isRecording ? "var(--danger)" : "var(--text-muted)" }}>
                  <span>{isRecording ? "Mendengarkan terus sampai tombol kirim ditekan." : speechSupported ? "Enter untuk kirim, Shift+Enter untuk baris baru." : "Browser ini belum mendukung speech recognition."}</span>
                  <span style={{ color: "var(--text-muted)" }}>{currentInput.trim().split(/\s+/).filter(Boolean).length} kata</span>
                </div>
              </div>
              <button type="button" onClick={handleSendMessage} disabled={!currentInput.trim() || chatLoading} style={{ width: isMobile ? "42px" : "50px", height: isMobile ? "42px" : "50px", borderRadius: "50%", border: "none", cursor: currentInput.trim() && !chatLoading ? "pointer" : "not-allowed", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: currentInput.trim() ? "var(--primary)" : "var(--surface-hover)", color: currentInput.trim() ? "white" : "var(--text-muted)" }} title="Kirim jawaban">
                <PremiumIcon name="send" size={isMobile ? 18 : 20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmEnd && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "90%", maxWidth: "400px", padding: "2rem", textAlign: "center" }}>
            <PremiumIcon name="alertTriangle" size={48} style={{ color: "var(--warning)", margin: "0 auto 1rem" }} />
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Akhiri Sidang?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Sesi saat ini akan ditutup dan riwayat obrolan akan dihapus secara permanen.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setShowConfirmEnd(false)}>Batal</button>
              <button className="btn btn-primary" style={{ backgroundColor: "var(--danger)", borderColor: "var(--danger)" }} onClick={confirmEndSession}>Ya, Akhiri</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
