/**
 * Gemini Live WebSocket Client
 * Menangani koneksi WebSocket real-time dengan Gemini Live API melalui Proxy
 */

// MENGGUNAKAN MODEL BARU SESUAI REQUEST
const GEMINI_LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";

// DITAMBAHKAN 4 PILIHAN SUARA SESUAI DOKUMENTASI GOOGLE
export const VOICE_OPTIONS = [
  { id: "Puck", label: "Puck - Suara laki-laki santai", description: "Friendly, energetic tone" },
  { id: "Aoede", label: "Aoede - Suara perempuan lembut", description: "Warm, expressive tone" },
  { id: "Charon", label: "Charon - Suara laki-laki tegas", description: "Calm, authoritative tone" },
  { id: "Kore", label: "Kore - Suara perempuan dinamis", description: "Clear, professional tone" },
];

export class GeminiLiveClient {
  constructor({ wsUrl, voiceName = "Puck", onMessage, onStatus, onError }) {
    this.wsUrl = wsUrl;
    this.voiceName = voiceName;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.onError = onError;

    this.ws = null;
    this.audioContext = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.isSetupComplete = false;
  }

  async connect() {
    try {
      this.onStatus?.("connecting");
      this.isSetupComplete = false;

      console.log("[GeminiLive] Connecting to proxy:", this.wsUrl.replace(/secret=[^&]+/, "secret=***"));

      this.ws = new WebSocket(this.wsUrl);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => this._handleOpen();
      this.ws.onmessage = (event) => this._handleMessage(event);
      this.ws.onclose = () => this._handleClose();
      this.ws.onerror = (error) => this._handleError(error);

      return new Promise((resolve, reject) => {
        this.onOpenResolve = resolve;
        this.onOpenReject = reject;
        setTimeout(() => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupComplete) {
            reject(new Error("WebSocket connection or Setup timeout"));
          }
        }, 8000);
      });
    } catch (error) {
      console.error("[GeminiLive] Connect error:", error);
      this.onError?.(error);
      throw error;
    }
  }

  _handleOpen() {
    console.log("[GeminiLive] ✓ WebSocket Connected, sending setup payload...");

    const setupMessage = {
      setup: {
        model: GEMINI_LIVE_MODEL,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voiceName,
              },
            },
          },
        },
        realtime_input_config: {
          automatic_activity_detection: {
            silence_duration_ms: 600,
          }
        },
        systemInstruction: {
          parts: [
            {
              text: 'Kamu adalah "Dosen AI" atau biasa dipanggil "Prof Skripzy" di platform Skripzy, asisten akademik berbahasa Indonesia. Jawab dalam 1-3 kalimat yang padat dan sangat natural seolah sedang bertelepon. Berhentilah berbicara jika disela pengguna.',
            },
          ],
        },
      },
    };

    try {
      this.ws.send(JSON.stringify(setupMessage));
    } catch (error) {
      this.onError?.(error);
      this.onOpenReject?.(error);
    }
  }

  _handleMessage(event) {
    try {
      let textData = event.data;

      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => { this._processJSON(reader.result); };
        reader.readAsText(event.data);
        return;
      } else if (event.data instanceof ArrayBuffer) {
        const dec = new TextDecoder("utf-8");
        textData = dec.decode(event.data);
      }

      this._processJSON(textData);

    } catch (error) {
      console.error("[GeminiLive] Message parsing error:", error);
    }
  }

  _processJSON(textData) {
    const message = JSON.parse(textData);

    if (message.error) {
      console.error("[GeminiLive] Server Error:", message.error);
      this.onError?.(new Error(message.error.message || "Unknown API Error"));
      this.onOpenReject?.(new Error(message.error.message));
      return;
    }

    if (message.setupComplete) {
      console.log("[GeminiLive] Setup completed by server ✓");
      this.isSetupComplete = true;
      this.onStatus?.("connected");
      this.onOpenResolve?.();
      return;
    }

    if (message?.serverContent?.modelTurn?.parts) {
      const parts = message.serverContent.modelTurn.parts;

      const textPart = parts.find((p) => p.text);
      if (textPart?.text) {
        this.onMessage?.({ role: "model", text: textPart.text });
      }

      const audioPart = parts.find((p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm"));
      if (audioPart) {
        const base64 = audioPart.inlineData.data;
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        this.audioQueue.push(bytes.buffer);
        this._playNextAudioChunk();
      }
    }

    if (message?.serverContent?.turnComplete) {
      this.onStatus?.("listening");
    }
  }

  _handleClose() {
    console.log("[GeminiLive] WebSocket Disconnected");
    this.onStatus?.("disconnected");
    this.isSetupComplete = false;
  }

  _handleError(error) {
    console.error("[GeminiLive] WebSocket Error:", error);
    this.onError?.(error);
  }

  sendAudioBase64(base64Data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete) {
      try {
        const realtimeMsg = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data,
              },
            ],
          },
        };
        this.ws.send(JSON.stringify(realtimeMsg));
      } catch (error) {
        console.error("[GeminiLive] Error sending audio realtime:", error);
      }
    }
  }

  /**
   * FITUR BARU: Memaksa AI berhenti menunggu dan langsung menjawab.
   * Diperbarui: Menambahkan `turns: []` agar schema validator Google tidak menolak JSON.
   */



  sendText(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isSetupComplete) {
      const clientMessage = {
        clientContent: {
          turns: [{ role: "user", parts: [{ text: text }] }],
          turnComplete: true,
        },
      };
      this.ws.send(JSON.stringify(clientMessage));
      this.onStatus?.("thinking");
    }
  }

  _playNextAudioChunk() {
    if (this.audioQueue.length === 0) return;

    this.onStatus?.("speaking");

    const pcmBuffer = this.audioQueue.shift();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      this.nextPlayTime = 0;
    }

    // Ensure context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    try {
      const int16Array = new Int16Array(pcmBuffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Schedule seamless gapless playback
      const currentTime = this.audioContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        // If we fell behind (buffer underrun), start playing slightly in the future
        this.nextPlayTime = currentTime + 0.05;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      source.onended = () => {
        // Only switch back to listening if there's no more audio queued or playing
        if (this.audioQueue.length === 0 && this.audioContext.currentTime >= this.nextPlayTime - 0.1) {
          this.onStatus?.("listening");
        }
      };

      // Instantly schedule the next chunk if it's already in the queue
      if (this.audioQueue.length > 0) {
        this._playNextAudioChunk();
      }

    } catch (error) {
      console.error("[GeminiLive] Audio playback error:", error);
      if (this.audioQueue.length > 0) {
        this._playNextAudioChunk();
      }
    }
  }

  disconnect() {
    this.isSetupComplete = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}