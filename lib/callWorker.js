const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

// ── Model Registry ───────────────────────────────────────────
export const MODELS = {
  primary: "gemini-3.1-flash-preview",       
  secondary: "gemini-2.5-flash",               
  lite: "gemini-3.1-flash-lite-preview",           
  live: "gemini-3.1-flash-live-preview", // Live voice via WebSocket
  liveAudio: "gemini-2.5-flash-native-audio-preview-12-2025", 
  grounding: "gemini-2.0-flash-exp",
};

// ── Core caller (internal) ───────────────────────────────────
async function _call({ prompt, history, systemInstruction, model, group, temperature, thinkingConfig, useSearchGrounding = false, returnMetadata = false, attempt = 0 }) {
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
      return await _call({ prompt, history, systemInstruction, model, group: groupName, temperature, thinkingConfig, useSearchGrounding, returnMetadata, attempt: 0 });
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