const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

// ── Model Registry ───────────────────────────────────────────
export const MODELS = {
  primary: "gemini-flash-latest",
  secondary: "gemini-2.5-flash",
  lite: "gemini-flash-lite-latest",
  live: "gemini-3.1-flash-live-preview", // Live voice via WebSocket
  liveAudio: "gemini-2.5-flash-native-audio-preview-12-2025",
  grounding: "gemini-2.0-flash-exp",
  embedding: "gemini-embedding-2",
};

// ── Core caller (internal) ───────────────────────────────────
async function _call({ prompt, history, systemInstruction, model, group, temperature, thinkingConfig, useSearchGrounding = false, returnMetadata = false, responseMimeType, attempt = 0 }) {
  const path = `/v1beta/models/${model}:generateContent`;

  let finalContents = [];
  if (history && Array.isArray(history) && history.length > 0) {
    finalContents = history.map(item => ({
      role: item.role,
      parts: [{ text: item.text }]
    }));
  }
  if (prompt) {
    finalContents.push({ role: "user", parts: [{ text: prompt }] });
  }

  const body = {
    contents: finalContents,
    generationConfig: {
      temperature: Math.min(Math.max(temperature, 0.1), 2.0),
    },
  };

  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }

  if (thinkingConfig) {
    body.generationConfig.thinkingConfig = thinkingConfig;
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  // Add search grounding if enabled
  if (useSearchGrounding) {
    body.tools = [
      {
        googleSearch: {}
      }
    ];
  }

  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-skripzy-secret": WORKER_SECRET,
      "x-api-group": group,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const fallbackChain = [MODELS.primary, MODELS.secondary, MODELS.lite];
    const nextIndex = attempt + 1;
    if (nextIndex < fallbackChain.length) {
      console.warn(`[Worker] Model ${model} gagal (${res.status}). Mencoba ${fallbackChain[nextIndex]}...`);
      return _call({ prompt, history, systemInstruction, model: fallbackChain[nextIndex], group, temperature, thinkingConfig, useSearchGrounding, returnMetadata, attempt: nextIndex });
    }

    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || `Semua model gagal merespons.`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  const groundingMetadata = candidate?.groundingMetadata;

  if (!text) throw new Error("Respons AI kosong. Silakan coba lagi.");

  if (returnMetadata) {
    return {
      text: text.trim(),
      groundingMetadata: groundingMetadata || null
    };
  }

  return text.trim();
}

/**
 * Panggil Gemini via Cloudflare Worker.
 */
export async function callGemini({
  prompt,
  history = [],
  systemInstruction = null,
  model = MODELS.primary,
  group = "group_3",
  temperature = 0.7,
  thinkingConfig = null,
  useSearchGrounding = false,
  returnMetadata = false,
  responseMimeType = null,
}) {
  const groupCandidates = Array.isArray(group)
    ? group
    : typeof group === "string"
      ? group.split(",").map((item) => item.trim()).filter(Boolean)
      : ["group_3"];

  const groupsToTry = groupCandidates.length ? groupCandidates : ["group_3"];
  let lastError = null;

  for (const groupName of groupsToTry) {
    try {
      return await _call({ prompt, history, systemInstruction, model, group: groupName, temperature, thinkingConfig, useSearchGrounding, returnMetadata, responseMimeType, attempt: 0 });
    } catch (err) {
      lastError = err;
      if (groupsToTry.length === 1) break;
    }
  }

  throw new Error(lastError?.message || `Semua grup ${groupsToTry.join(", ")} gagal. Silakan coba lagi.`);
}

/**
 * Request URL Proxy WSS ke Cloudflare Worker untuk Gemini Live
 * Berfungsi mengamankan API key di sisi server Cloudflare
 * @param {Object} opts
 * @param {string} [opts.group] - API group untuk load balancing
 * @returns {string} URL WebSocket Proxy dengan secret terenkripsi
 */
export function getGeminiLiveProxyUrl({ group = "group_4" } = {}) {
  const groupCandidates = Array.isArray(group)
    ? group
    : typeof group === "string"
      ? group.split(",").map((item) => item.trim()).filter(Boolean)
      : ["group_4"];

  const targetGroup = groupCandidates[0] || "group_4";

  // Deteksi environment (http -> ws, https -> wss)
  const wsProtocol = WORKER_URL.startsWith("https") ? "wss://" : "ws://";
  const host = WORKER_URL.replace(/^https?:\/\//, "");

  // URL aman ini akan dikonsumsi oleh WebSocket client di frontend
  return `${wsProtocol}${host}/ws/gemini-live?group=${targetGroup}&secret=${WORKER_SECRET}`;
}

/**
 * Panggil Gemini dengan dukungan Streaming (Real-time Typing) via Cloudflare Worker.
 * Harus dipanggil dengan metode callback `onStream` untuk menerima per-kata.
 */
export async function callGeminiStream({
  prompt,
  history = [],
  systemInstruction = null,
  model = MODELS.primary,
  group = "group_1",
  temperature = 0.7,
  thinkingConfig = null,
  useSearchGrounding = false,
  returnMetadata = false,
  onStream = () => { },
  attempt = 0,
}) {
  const path = `/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  let finalContents = [];
  if (history && Array.isArray(history) && history.length > 0) {
    finalContents = history.map(item => ({
      role: item.role,
      parts: [{ text: item.text }]
    }));
  }
  if (prompt) {
    finalContents.push({ role: "user", parts: [{ text: prompt }] });
  }

  const body = {
    contents: finalContents,
    generationConfig: {
      temperature: Math.min(Math.max(temperature, 0.1), 2.0),
    },
  };

  if (thinkingConfig) {
    body.generationConfig.thinkingConfig = thinkingConfig;
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  if (useSearchGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-skripzy-secret": WORKER_SECRET,
      "x-api-group": group,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const fallbackChain = [MODELS.primary, MODELS.secondary, MODELS.lite];
    const nextIndex = attempt + 1;
    if (nextIndex < fallbackChain.length) {
      console.warn(`[Worker Stream] Model ${model} gagal (${res.status}). Mencoba ${fallbackChain[nextIndex]}...`);
      return callGeminiStream({
        prompt, history, systemInstruction, model: fallbackChain[nextIndex],
        group, temperature, thinkingConfig, useSearchGrounding, returnMetadata, onStream, attempt: nextIndex
      });
    }

    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || `Sistem Stream gagal merespons setelah mencoba semua model.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let fullText = "";
  let buffer = "";
  let lastMetadata = null;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last line in buffer as it might be incomplete
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.replace("data: ", "").trim();
          if (dataStr === "[DONE]") {
            done = true;
            break;
          }
          try {
            const dataObj = JSON.parse(dataStr);
            const candidate = dataObj?.candidates?.[0];
            const textChunk = candidate?.content?.parts?.[0]?.text;

            if (candidate?.groundingMetadata) {
              lastMetadata = candidate.groundingMetadata;
            }

            if (textChunk) {
              fullText += textChunk;
              onStream(fullText);
            }
          } catch (e) {
            // Ignore partial parse edge cases
          }
        }
      }
    }
  }

  if (returnMetadata) {
    return { text: fullText.trim(), groundingMetadata: lastMetadata };
  }
  return fullText.trim();
}

/**
 * Dapatkan embedding vektor untuk teks menggunakan Gemini.
 * Digunakan untuk RAG / Semantic Search.
 */
export async function getEmbedding(text, group = "group_3") {
  if (!text) throw new Error("Teks tidak boleh kosong untuk embedding.");

  const path = `/v1beta/models/${MODELS.embedding}:embedContent`;

  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-skripzy-secret": WORKER_SECRET,
      "x-api-group": group,
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }]
      }
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || `Gagal mengambil embedding.`);
  }

  const data = await res.json();
  const vector = data?.embedding?.values;

  if (!vector) throw new Error("Gagal mendapatkan vektor dari respons AI.");

  return vector;
}
/**
 * Dapatkan banyak embedding sekaligus (Batch) untuk efisiensi RAG.
 * Maksimal 100 teks per request.
 */
export async function getBatchEmbeddings(texts, group = "group_3") {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return [];

  const res = await fetch(`${WORKER_URL}/api/ai/embed-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-skripzy-secret": WORKER_SECRET,
      "x-api-group": group,
    },
    body: JSON.stringify({ texts, model: MODELS.embedding }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || "Gagal mengambil batch embedding.");
  }

  const data = await res.json();
  return data.embeddings; // Array of number[]
}
