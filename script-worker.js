/**
 * SKRIPZY CLOUDFLARE WORKER - GEMINI LOAD BALANCER
 * Script ini menggunakan Environment Variables Cloudflare.
 * Mendukung REST API biasa dan WebSocket Proxy Pass-Through untuk Gemini Live.
 */

const RETRYABLE_STATUS = new Set([401, 403, 408, 429, 500, 502, 503, 504]);

// ──── DOKU PAYMENT GATEWAY HELPERS ────

function getDokuConfig(env) {
    return {
        clientId: env.DOKU_CLIENT_ID || "",
        secretKey: env.DOKU_SECRET_KEY || "",
        baseUrl: env.DOKU_BASE_URL || "https://api-sandbox.doku.com",
        callbackUrl: env.DOKU_CALLBACK_URL || "https://app.skripzy.id/dashboard/langganan/",
    };
}

function getIpaymuConfig(env, requestUrl = "") {
    const origin = requestUrl ? new URL(requestUrl).origin : "";
    const appCallbackUrl = env.IPAY_CALLBACK_URL || env.IPAYMU_CALLBACK_URL || "https://app.skripzy.id/dashboard/langganan/";
    const ipaymuEnv = String(env.IPAY_ENV || env.IPAYMU_ENV || "production").trim().toLowerCase();
    const defaultBaseUrl = ipaymuEnv === "sandbox"
        ? "https://sandbox.ipaymu.com/api/v2"
        : "https://my.ipaymu.com/api/v2";

    return {
        apiKey: String(env.IPAY_API_KEY || env.IPAYMU_API_KEY || "").trim(),
        va: String(env.IPAY_VA || env.IPAYMU_VA || env.IPAYMU_VA_NUMBER || "").trim(),
        baseUrl: String(env.IPAY_BASE_URL || env.IPAYMU_BASE_URL || defaultBaseUrl).trim().replace(/\/+$/, ""),
        returnUrl: String(env.IPAY_RETURN_URL || env.IPAYMU_RETURN_URL || appCallbackUrl).trim(),
        cancelUrl: String(env.IPAY_CANCEL_URL || env.IPAYMU_CANCEL_URL || appCallbackUrl).trim(),
        notifyUrl: String(env.IPAY_NOTIFY_URL || env.IPAYMU_NOTIFY_URL || `${origin}/api/ipaymu/notification`).trim(),
    };
}

function generateRequestId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateInvoiceNumber(prefix = "SKRZ") {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${dateStr}-${timeStr}-${rand}`;
}

async function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function generateDokuDigest(bodyString) {
    const encoder = new TextEncoder();
    const data = encoder.encode(bodyString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return arrayBufferToBase64(hashBuffer);
}

async function generateDokuSignature(clientId, secretKey, requestId, timestamp, requestTarget, bodyString) {
    const digest = await generateDokuDigest(bodyString);

    const signatureComponents = [
        `Client-Id:${clientId}`,
        `Request-Id:${requestId}`,
        `Request-Timestamp:${timestamp}`,
        `Request-Target:${requestTarget}`,
        `Digest:${digest}`,
    ].join("\n");

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(signatureComponents);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureBase64 = await arrayBufferToBase64(signatureBuffer);

    return `HMACSHA256=${signatureBase64}`;
}

async function verifyDokuNotificationSignature(headers, rawBody, clientId, secretKey) {
    try {
        const incomingSignature = headers.get("Signature") || headers.get("signature") || "";
        const requestId = headers.get("Request-Id") || headers.get("request-id") || "";
        const requestTimestamp = headers.get("Request-Timestamp") || headers.get("request-timestamp") || "";

        if (!incomingSignature || !requestId || !requestTimestamp) {
            return false;
        }

        const notificationTarget = "/api/doku/notification";
        const expectedSignature = await generateDokuSignature(
            clientId, secretKey, requestId, requestTimestamp, notificationTarget, rawBody
        );

        return incomingSignature === expectedSignature;
    } catch (error) {
        console.error("[DOKU] Signature verification error:", error.message);
        return false;
    }
}

function getIpaymuTimestamp() {
    const now = new Date(Date.now() + (7 * 60 * 60 * 1000));
    const pad = (value) => String(value).padStart(2, "0");
    return [
        now.getUTCFullYear(),
        pad(now.getUTCMonth() + 1),
        pad(now.getUTCDate()),
        pad(now.getUTCHours()),
        pad(now.getUTCMinutes()),
        pad(now.getUTCSeconds()),
    ].join("");
}

function getMaskedValue(value = "") {
    const text = String(value || "");
    if (!text) return "";
    if (text.length <= 8) return `${"*".repeat(Math.max(0, text.length - 2))}${text.slice(-2)}`;
    return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

async function generateIpaymuSignature(apiKey, va, bodyString, method = "POST") {
    const encoder = new TextEncoder();
    const bodyHashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(bodyString));
    const bodyHash = arrayBufferToHex(bodyHashBuffer).toLowerCase();
    const stringToSign = `${method.toUpperCase()}:${va}:${bodyHash}:${apiKey}`;
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(apiKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(stringToSign));
    return arrayBufferToHex(signatureBuffer).toLowerCase();
}

function extractIpaymuPaymentUrl(data) {
    return (
        data?.Data?.Url ||
        data?.Data?.url ||
        data?.data?.Url ||
        data?.data?.url ||
        data?.Url ||
        data?.url ||
        null
    );
}

function extractIpaymuSessionId(data) {
    return (
        data?.Data?.SessionID ||
        data?.Data?.SessionId ||
        data?.Data?.sessionID ||
        data?.Data?.sessionId ||
        data?.data?.SessionID ||
        data?.data?.sessionID ||
        data?.sessionID ||
        data?.sessionId ||
        null
    );
}

function parseIpaymuNotificationBody(rawBody, contentType = "") {
    if (!rawBody) return {};

    if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
        return JSON.parse(rawBody);
    }

    const params = new URLSearchParams(rawBody);
    const parsed = {};
    for (const [key, value] of params.entries()) {
        parsed[key] = value;
    }
    return parsed;
}

function getIpaymuNotificationReference(notifData = {}) {
    return (
        notifData.referenceId ||
        notifData.reference_id ||
        notifData.ReferenceID ||
        notifData.ReferenceId ||
        notifData.reference ||
        notifData.invoiceNumber ||
        notifData.invoice_number ||
        notifData.sid ||
        notifData.SessionID ||
        notifData.sessionID ||
        notifData.sessionId ||
        ""
    );
}

function getIpaymuNotificationStatus(notifData = {}) {
    const rawStatus = (
        notifData.status ||
        notifData.Status ||
        notifData.transactionStatus ||
        notifData.TransactionStatus ||
        notifData.paymentStatus ||
        notifData.payment_status ||
        notifData.result ||
        ""
    );
    return String(rawStatus).trim().toLowerCase();
}

function isIpaymuPaidStatus(status) {
    return ["berhasil", "success", "successful", "paid", "settlement", "settled", "completed", "1"].includes(status);
}

function isIpaymuFailedStatus(status) {
    return ["gagal", "failed", "failure", "expired", "expire", "cancel", "cancelled", "canceled", "void", "refund", "refunded", "0"].includes(status);
}

function getIpaymuPaidAmount(notifData = {}) {
    const rawAmount =
        notifData.amount ||
        notifData.Amount ||
        notifData.total ||
        notifData.Total ||
        notifData.price ||
        notifData.Price ||
        notifData.paidAmount ||
        notifData.paid_amount ||
        null;

    const numeric = Number(String(rawAmount || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
}

async function applyApprovedBilling(env, docData, now, gatewayLabel = "Payment") {
    const userId = docData.userId;
    if (!userId || !env.DB) return;

    const userStmt = env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(userId);
    const { results: userResults } = await userStmt.all();
    const userData = userResults[0];

    if (!userData) return;

    const requestType = docData.requestType || "topup";

    if (requestType === "plan") {
        const planCredits = Number(docData.amount) || 0;
        const currentCredits = Number(userData.credits) || 0;

        await env.DB.prepare(`UPDATE users SET plan = ?, credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(docData.planId || "pro", currentCredits + planCredits, userId)
            .run();

        console.log(`[${gatewayLabel}] Plan upgraded for user ${userId}: ${docData.planId}, +${planCredits} credits (D1)`);
    } else {
        const creditsToAdd = Number(docData.amount) || 0;
        const currentCredits = Number(userData.credits) || 0;

        await env.DB.prepare(`UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .bind(currentCredits + Math.max(0, creditsToAdd), userId)
            .run();

        console.log(`[${gatewayLabel}] Credits added for user ${userId}: +${creditsToAdd} (D1)`);
    }

    if (docData.promoId) {
        await env.DB.prepare(`UPDATE promos SET usedCount = usedCount + 1, updatedAt = ? WHERE id = ?`)
            .bind(now, docData.promoId)
            .run();
    }
}

function createCorsHeaders(extra = {}) {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-skripzy-secret, x-api-group, Authorization",
        "Access-Control-Allow-Methods": "POST, GET, PATCH, DELETE, OPTIONS",
        "Access-Control-Expose-Headers": "x-cf-edge-info",
        "Content-Type": "application/json",
        ...extra,
    };
}

function getFirebaseConfig(env) {
    return {
        projectId: env.FIREBASE_PROJECT_ID || "skripzy-4fbaa",
        webApiKey: env.FIREBASE_WEB_API_KEY || "AIzaSyB2YYmDJHpb3Ou8GZzpYWc-b0CuBx4nLJQ",
    };
}

function extractBearerToken(request) {
    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    return authHeader.slice(7).trim();
}

function slugify(value = "") {
    return String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 80);
}

/**
 * Format range tahun menjadi tanggal OpenAlex yang valid.
 * OpenAlex mendukung from_publication_date dan to_publication_date,
 * bukan publication_year:YYYY-YYYY.
 */
function buildOpenAlexDateFilter(yearFrom, yearTo) {
    const fromYear = Number.parseInt(yearFrom, 10);
    const toYear = Number.parseInt(yearTo, 10);

    if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
        return null;
    }

    const safeFrom = Math.min(fromYear, toYear);
    const safeTo = Math.max(fromYear, toYear);

    return [
        `from_publication_date:${safeFrom}-01-01`,
        `to_publication_date:${safeTo}-12-31`,
    ].join(",");
}

async function verifyFirebaseToken(idToken, env) {
    if (!idToken) return null;
    const limit = RATE_LIMITS[model] || 1500;

    try {
        // Limit reset pada tengah malam waktu PT (Pacific Time, sekitar UTC-8)
        const stmt = env.DB.prepare(`
            SELECT SUM(requests_count) as total_requests 
            FROM api_usage 
            WHERE api_key = ? 
              AND model_name = ? 
              AND date(timestamp, '-8 hours') = date('now', '-8 hours')
        `).bind(apiKeyObj.name, model);
        const result = await stmt.first();
        const total = result?.total_requests || 0;
        return total < limit; 
    } catch (e) {
        console.error("Failed to check rate limit", e);
        return true; 
    }
}

async function recordApiUsage(env, apiKeyObj, model, tokensUsed = 0, requestsCount = 1) {
    if (!env.DB) return;
    try {
        const timestamp = new Date().toISOString();
        const stmt = env.DB.prepare(`INSERT INTO api_usage (api_key, model_name, tokens_used, requests_count, timestamp) VALUES (?, ?, ?, ?, ?)`)
            .bind(apiKeyObj.name, model, tokensUsed, requestsCount, timestamp);
        await stmt.run();
    } catch (e) {
        console.error("Failed to record API usage", e);
    }
}

// ── Centralized Gemini Rotation Logic ────────────────────────

async function executeGeminiWithRotation(env, ctx, groupsToTry, urlModel, isStream, payload, clientColo, clientCountry, forceSingleModel = false) {
    const API_GROUPS = getApiGroups(env);

    let modelsToTry = [urlModel];
    if (!forceSingleModel) {
        if (urlModel === "gemini-flash-latest") {
            modelsToTry = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];
        } else if (urlModel === "gemini-2.5-flash") {
            modelsToTry = ["gemini-2.5-flash", "gemini-flash-lite-latest"];
        }
    }

    let lastError = null;
    let isLocationError = false;

    for (const groupName of groupsToTry) {
        const keys = (API_GROUPS[groupName] || []).filter(k => k.key);
        for (const keyObj of keys) {
            for (const model of modelsToTry) {
                // Pre-flight Check
                const canUse = await checkLocalRateLimit(env, keyObj, model);
                if (!canUse) {
                    console.log(`[Rate Limit] Skipping ${model} on key ${keyObj.name}... (Limit Reached)`);
                    continue; 
                }

                const isEmbedding = urlModel.includes("embedding");
                const path = isStream
                    ? `/v1beta/models/${model}:streamGenerateContent?alt=sse`
                    : isEmbedding
                        ? `/v1beta/models/${model}:embedContent`
                        : `/v1beta/models/${model}:generateContent`;
                const separator = path.includes("?") ? "&" : "?";
                const destinationURL = `https://gateway.ai.cloudflare.com/v1/094df8c8c682a53ca0a27d87735baa51/skripzy-ai/google-ai-studio${path}${separator}key=${keyObj.key}`;

                const apiResponse = await fetch(destinationURL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                });

                if (apiResponse.ok) {
                    if (!isStream) {
                        const clone = apiResponse.clone();
                        ctx.waitUntil(
                            clone.json().then(data => {
                                const tokens = data?.usageMetadata?.totalTokenCount || 0;
                                return recordApiUsage(env, keyObj, model, tokens, 1);
                            }).catch(() => {})
                        );
                    } else {
                        ctx.waitUntil(recordApiUsage(env, keyObj, model, 0, 1));
                    }

                    return new Response(apiResponse.body, {
                        status: apiResponse.status,
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Expose-Headers": "x-cf-edge-info",
                            "x-cf-edge-info": `${clientColo}-${clientCountry}`,
                            "Content-Type": apiResponse.headers.get("Content-Type") || "application/json",
                        },
                    });
                }

                const errorText = await apiResponse.text();
                lastError = { status: apiResponse.status, body: errorText };

                if ((apiResponse.status === 400 || apiResponse.status === 403) &&
                    (errorText.includes("User location is not supported") ||
                     errorText.includes("location") ||
                     errorText.includes("region") ||
                     errorText.includes("PERMISSION_DENIED"))) {
                    isLocationError = true;
                    break; 
                }

                if (apiResponse.status === 429) {
                    ctx.waitUntil(recordApiUsage(env, keyObj, model, 0, 999999));
                    continue; 
                }

                if (!RETRYABLE_STATUS.has(apiResponse.status)) {
                    break;
                }
            }
            if (isLocationError) break; 
        }
        if (isLocationError) break;
    }

    // FALLBACK KE GROQ
    console.warn(`[REST Proxy] Gemini failed. Last status: ${lastError?.status}. Falling back to Groq...`);
    try {
        const reqBody = JSON.parse(payload);
        const systemInstruction = reqBody.systemInstruction?.parts?.[0]?.text;
        const prompt = reqBody.contents?.[reqBody.contents.length - 1]?.parts?.[0]?.text;
        const history = reqBody.contents?.slice(0, -1)?.map(c => ({
            role: c.role,
            text: c.parts?.[0]?.text
        }));
        const temperature = reqBody.generationConfig?.temperature;
        
        const groqResult = await internalGroqFallback(env, prompt, history, systemInstruction, temperature);
        
        if (isStream) {
            const fakeGeminiSSE = `data: ${JSON.stringify({
                candidates: [{ content: { parts: [{ text: groqResult.text }] } }]
            })}\n\ndata: [DONE]\n\n`;
            
            return new Response(fakeGeminiSSE, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Expose-Headers": "x-cf-edge-info",
                    "x-cf-edge-info": `${clientColo}-${clientCountry}`,
                    "Content-Type": "text/event-stream",
                }
            });
        } else {
            const fakeGeminiResponse = {
                candidates: [{ content: { parts: [{ text: groqResult.text }] } }]
            };
            return new Response(JSON.stringify(fakeGeminiResponse), {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Expose-Headers": "x-cf-edge-info",
                    "x-cf-edge-info": `${clientColo}-${clientCountry}`,
                    "Content-Type": "application/json",
                }
            });
        }
    } catch (err) {
        console.error("[Groq Fallback] Error:", err.message);
    }

    const errorHeaders = createCorsHeaders();
    errorHeaders["Access-Control-Expose-Headers"] = "x-cf-edge-info";
    errorHeaders["x-cf-edge-info"] = `${clientColo}-${clientCountry}`;

    if (lastError && !RETRYABLE_STATUS.has(lastError.status)) {
        return new Response(lastError.body, {
            status: lastError.status,
            headers: errorHeaders,
        });
    }

    return new Response(JSON.stringify({
        error: `Sistem sedang padat atau kena limit. Silakan coba sesaat lagi.`,
        retryable: true,
        upstreamStatus: lastError?.status ?? 503,
        details: lastError?.body ?? null,
    }), {
        status: 503,
        headers: errorHeaders,
    });
}

async function proxyGeminiGeneration({ env, ctx, body, groupHeader, model, systemInstruction = null, temperature = 0.6 }) {
    const groupsToTry = (groupHeader || "group_3").split(",").map((item) => item.trim()).filter(Boolean);
    const finalGroups = groupsToTry.length ? groupsToTry : ["group_3"];

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: body.prompt }],
            }
        ],
        generationConfig: {
            temperature,
        },
    };

    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await executeGeminiWithRotation(
        env, 
        ctx,
        finalGroups, 
        model, 
        false, 
        JSON.stringify(payload), 
        "WORKSPACE", 
        "ID",
        false
    );

    if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
            return { text, model };
        }
    }

    const errText = await response.text().catch(()=>"Failed to read error body");
    throw new Error(errText || "Gagal menghasilkan konten AI workspace.");
}

async function internalGroqFallback(env, prompt, history, systemInstruction, temperature) {
    // Support both GRO_API_KEY (user's env name) and GROQ_API_KEY as aliases
    const groqApiKey = env.GRO_API_KEY || env.GROQ_API_KEY;
    if (!groqApiKey) throw new Error("GRO_API_KEY not configured in Cloudflare Worker environment");

    const messages = [];
    if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
    }
    if (history && Array.isArray(history)) {
        for (const msg of history) {
            messages.push({ role: msg.role === "model" ? "assistant" : "user", content: msg.text });
        }
    }
    messages.push({ role: "user", content: prompt });

    // Production models first, preview as last resort
    const GROQ_MODELS = [
        "llama-3.3-70b-versatile",   // Production — high quality, setara Gemini 1.5 Pro
        "llama-4-scout-17b-16e-instruct", // Preview — cepat, setara Gemini 2.0 Flash
        "llama-3.1-8b-instant",      // Emergency fallback — paling ringan, pasti available
    ];
    let lastGroqError = "Unknown error";

    for (const groqModel of GROQ_MODELS) {
        try {
            console.log(`[Groq Fallback] Trying model: ${groqModel}`);
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: groqModel,
                    messages: messages,
                    temperature: Math.min(Math.max(temperature || 0.7, 0.0), 2.0),
                    max_tokens: 8192,
                })
            });

            const groqData = await groqRes.json();
            if (groqRes.ok && groqData.choices?.[0]?.message?.content) {
                console.log(`[Groq Fallback] Success with model: ${groqModel}`);
                return { text: groqData.choices[0].message.content.trim(), model: `groq/${groqModel}` };
            } else {
                lastGroqError = groqData.error?.message || JSON.stringify(groqData);
                console.warn(`[Groq Fallback] Model ${groqModel} failed: ${lastGroqError}`);
            }
        } catch (e) {
            lastGroqError = e.message;
            console.warn(`[Groq Fallback] Model ${groqModel} threw: ${e.message}`);
        }
    }
    throw new Error(`Semua model Groq gagal: ${lastGroqError}`);
}

const worker = {
    async fetch(request, env, ctx) {
        // Log lokasi edge server sesuai request CF
        const clientCountry = request.cf?.country || "UNKNOWN";
        const clientColo = request.cf?.colo || "UNKNOWN";
        const urlForLog = new URL(request.url);
        console.log(`[REQUEST] Path: ${urlForLog.pathname}, Edge Colo: ${clientColo}, Client Country: ${clientCountry}`);

        // Definisi Grup API Key
        const API_GROUPS = {
            group_1: [env.GEMINI_API_KEY_1, env.GEMINI_API_KEY_2],
            group_2: [env.GEMINI_API_KEY_3, env.GEMINI_API_KEY_4],
            group_3: [env.GEMINI_API_KEY_5, env.GEMINI_API_KEY_6],
            group_4: [env.GEMINI_API_KEY_7, env.GEMINI_API_KEY_8]
        };

        // 1. Tangani Preflight CORS
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, GET, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, x-skripzy-secret, x-api-group, Authorization",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        const url = new URL(request.url);
        const isPublicFormEndpoint = url.pathname.startsWith("/public/forms/");
        const isWorkspacePublishEndpoint = url.pathname === "/workspace/forms/publish";
        const isWorkspaceAiEndpoint = url.pathname === "/workspace/ai/chapter-generate";
        const isDokuCreatePayment = url.pathname === "/api/doku/create-payment";
        const isDokuNotification = url.pathname === "/api/doku/notification";
        const isIpaymuCreatePayment = url.pathname === "/api/ipaymu/create-payment";
        const isIpaymuNotification = url.pathname === "/api/ipaymu/notification";
        const isIpaymuTest = url.pathname === "/api/ipaymu/test-connection";

        // ──── ENDPOINT: IPAYMU CREATE PAYMENT ────
        if (isIpaymuTest && request.method === "POST") {
            const providedSecret = request.headers.get("x-skripzy-secret") || "";
            const expectedSecret = env.WORKER_SECRET || "";
            if (expectedSecret && providedSecret !== expectedSecret) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: createCorsHeaders(),
                });
            }

            const ipaymu = getIpaymuConfig(env, request.url);
            if (!ipaymu.apiKey || !ipaymu.va) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "iPaymu env belum lengkap.",
                    config: {
                        env: String(env.IPAY_ENV || env.IPAYMU_ENV || "production").trim().toLowerCase(),
                        baseUrl: ipaymu.baseUrl,
                        vaConfigured: Boolean(ipaymu.va),
                        apiKeyConfigured: Boolean(ipaymu.apiKey),
                        vaMasked: getMaskedValue(ipaymu.va),
                        apiKeyMasked: getMaskedValue(ipaymu.apiKey),
                    },
                }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }

            const bodyString = JSON.stringify({ account: ipaymu.va });
            const timestamp = getIpaymuTimestamp();
            const testBaseUrls = [
                ipaymu.baseUrl,
                "https://sandbox.ipaymu.com/api/v2",
                "https://my.ipaymu.com/api/v2",
            ].filter((item, index, arr) => item && arr.indexOf(item) === index);

            const checks = [];
            for (const baseUrl of testBaseUrls) {
                const signature = await generateIpaymuSignature(ipaymu.apiKey, ipaymu.va, bodyString, "POST");
                const response = await fetch(`${baseUrl}/balance`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        va: ipaymu.va,
                        signature,
                        timestamp,
                    },
                    body: bodyString,
                });
                const data = await response.json().catch(() => ({}));
                checks.push({
                    baseUrl,
                    ok: response.ok && Number(data?.Status ?? data?.status ?? 0) === 200,
                    upstreamOk: response.ok,
                    upstreamStatus: response.status,
                    response: data,
                });
            }

            const configuredCheck = checks[0] || {};

            return new Response(JSON.stringify({
                ok: Boolean(configuredCheck.ok),
                upstreamOk: Boolean(configuredCheck.upstreamOk),
                upstreamStatus: configuredCheck.upstreamStatus || 0,
                config: {
                    env: String(env.IPAY_ENV || env.IPAYMU_ENV || "production").trim().toLowerCase(),
                    baseUrl: ipaymu.baseUrl,
                    vaConfigured: Boolean(ipaymu.va),
                    apiKeyConfigured: Boolean(ipaymu.apiKey),
                    vaMasked: getMaskedValue(ipaymu.va),
                    apiKeyMasked: getMaskedValue(ipaymu.apiKey),
                    timestamp,
                },
                response: configuredCheck.response || null,
                checks,
            }), {
                status: 200,
                headers: createCorsHeaders(),
            });
        }

        if (isIpaymuCreatePayment && request.method === "POST") {
            const authToken = extractBearerToken(request);
            const session = await verifyFirebaseToken(authToken, env);
            if (!session) {
                return new Response(JSON.stringify({ error: "Sesi tidak valid. Silakan login ulang." }), {
                    status: 401,
                    headers: createCorsHeaders(),
                });
            }

            const payload = await request.json().catch(() => null);
            if (!payload || !payload.amount || payload.amount <= 0) {
                return new Response(JSON.stringify({ error: "Data pembayaran tidak valid." }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            const ipaymu = getIpaymuConfig(env, request.url);
            if (!ipaymu.apiKey || !ipaymu.va) {
                return new Response(JSON.stringify({ error: "iPaymu belum dikonfigurasi di server. Pastikan IPAY_API_KEY dan IPAY_VA tersedia." }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }

            try {
                const invoiceNumber = generateInvoiceNumber("SKRZ-IPM");
                const finalAmount = Math.round(payload.amount);
                const productName = payload.productName || "Skripzy";
                const customerName = payload.customerName || session.email || "Pengguna Skripzy";
                const customerEmail = payload.customerEmail || session.email || "";
                const returnUrl = `${ipaymu.returnUrl}${ipaymu.returnUrl.includes("?") ? "&" : "?"}payment=success&inv=${encodeURIComponent(invoiceNumber)}`;
                const cancelUrl = `${ipaymu.cancelUrl}${ipaymu.cancelUrl.includes("?") ? "&" : "?"}payment=cancelled&inv=${encodeURIComponent(invoiceNumber)}`;

                const ipaymuBody = {
                    account: ipaymu.va,
                    product: [productName],
                    qty: [1],
                    price: [finalAmount],
                    description: [`${productName} - ${invoiceNumber}`],
                    notifyUrl: ipaymu.notifyUrl,
                    returnUrl,
                    cancelUrl,
                    name: customerName,
                    email: customerEmail,
                    phone: payload.customerPhone || "",
                    buyerName: customerName,
                    buyerEmail: customerEmail,
                    buyerPhone: payload.customerPhone || "",
                    referenceId: invoiceNumber,
                    expired: payload.paymentDueHours || 24,
                    expiredType: "hours",
                };

                const bodyString = JSON.stringify(ipaymuBody);
                const signature = await generateIpaymuSignature(ipaymu.apiKey, ipaymu.va, bodyString, "POST");
                const timestamp = getIpaymuTimestamp();

                const ipaymuResponse = await fetch(`${ipaymu.baseUrl}/payment`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        va: ipaymu.va,
                        signature,
                        timestamp,
                    },
                    body: bodyString,
                });

                const ipaymuData = await ipaymuResponse.json().catch(() => ({}));
                const ipaymuStatus = Number(ipaymuData?.Status ?? ipaymuData?.status ?? 0);

                if (!ipaymuResponse.ok || (ipaymuStatus && ipaymuStatus !== 200)) {
                    console.error("[IPAYMU] Create payment failed:", JSON.stringify(ipaymuData));
                    const upstreamMessage = ipaymuData?.Message || ipaymuData?.message || "Gagal membuat pembayaran iPaymu.";
                    const isUnauthorizedSignature = String(upstreamMessage).toLowerCase().includes("signature");
                    return new Response(JSON.stringify({
                        error: isUnauthorizedSignature
                            ? "iPaymu menolak signature. Cek IPAY_API_KEY, IPAY_VA, dan IPAY_BASE_URL/IPAY_ENV di Cloudflare Worker."
                            : upstreamMessage,
                        details: ipaymuData,
                        gateway: {
                            baseUrl: ipaymu.baseUrl,
                            vaConfigured: Boolean(ipaymu.va),
                            apiKeyConfigured: Boolean(ipaymu.apiKey),
                        },
                    }), {
                        status: ipaymuResponse.ok ? 502 : ipaymuResponse.status,
                        headers: createCorsHeaders(),
                    });
                }

                const paymentUrl = extractIpaymuPaymentUrl(ipaymuData);
                const sessionId = extractIpaymuSessionId(ipaymuData);

                if (!paymentUrl) {
                    return new Response(JSON.stringify({
                        error: "Tidak mendapatkan link pembayaran dari iPaymu.",
                        details: ipaymuData,
                    }), {
                        status: 502,
                        headers: createCorsHeaders(),
                    });
                }

                const docId = invoiceNumber;
                const timestampNow = new Date().toISOString();
                const stmt = env.DB.prepare(`INSERT INTO topups (
                    id, userId, userName, userEmail, status, requestType, productName,
                    paymentMethodId, paymentMethodLabel, paymentChannelId, paymentChannelLabel,
                    paymentChannelGroup, invoiceNumber, dokuRequestId, paymentUrl, promoId,
                    promoCode, promoType, basePrice, discountAmount, finalPrice, customerNotes,
                    timestamp, planId, planName, billingPeriod, topupSlug, creditsBase, bonusCredits, amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(
                    docId, session.uid, customerName,
                    session.email || customerEmail || "", "waiting_payment",
                    payload.requestType || "topup", productName, "automatic",
                    "Pembayaran Otomatis (iPaymu)", "ipaymu-checkout", "iPaymu Checkout", "gateway",
                    invoiceNumber, sessionId || "", paymentUrl || "", payload.promoId || null,
                    payload.promoCode || null, payload.promoType || null,
                    Math.round(payload.basePrice || payload.amount || 0), Math.round(payload.discountAmount || 0),
                    finalAmount, "", timestampNow, payload.planId || null,
                    payload.planName || null, payload.billingPeriod || "monthly", payload.topupSlug || null,
                    payload.creditsBase || 0, payload.bonusCredits || 0, payload.creditsTotal || payload.amount || 0
                );
                await stmt.run();

                console.log(`[IPAYMU] Payment created in D1: inv=${invoiceNumber}, session=${sessionId || "-"}, url=${paymentUrl}`);

                return new Response(JSON.stringify({
                    ok: true,
                    payment_url: paymentUrl,
                    invoice_number: invoiceNumber,
                    doc_id: docId,
                    session_id: sessionId,
                }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            } catch (error) {
                console.error("[IPAYMU] Create payment error:", error.message);
                return new Response(JSON.stringify({ error: error.message || "Gagal memproses pembayaran." }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }
        }

        if (isIpaymuNotification && request.method === "POST") {
            const rawBody = await request.text();
            let notifData;
            try {
                notifData = parseIpaymuNotificationBody(rawBody, request.headers.get("Content-Type") || "");
            } catch {
                return new Response(JSON.stringify({ error: "Invalid notification body" }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            const referenceId = getIpaymuNotificationReference(notifData);
            const transactionStatus = getIpaymuNotificationStatus(notifData);
            const transactionAmount = getIpaymuPaidAmount(notifData);

            console.log(`[IPAYMU] Notification: ref=${referenceId || "-"}, status=${transactionStatus || "-"}, amount=${transactionAmount || 0}`);

            if (!referenceId) {
                return new Response(JSON.stringify({ ok: true, message: "No reference id" }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            try {
                const stmt = env.DB.prepare(`SELECT * FROM topups WHERE invoiceNumber = ? OR dokuRequestId = ?`).bind(referenceId, referenceId);
                const { results } = await stmt.all();
                const docData = results[0];

                if (!docData) {
                    console.warn(`[IPAYMU] No topup doc found for reference: ${referenceId}`);
                    return new Response(JSON.stringify({ ok: true, message: "Doc not found" }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                }

                if (docData.status === "approved" || docData.status === "rejected") {
                    console.log(`[IPAYMU] Reference ${referenceId} already processed as ${docData.status}`);
                    return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                }

                const now = new Date().toISOString();
                const expectedAmount = Number(docData.finalPrice) || 0;

                if (isIpaymuPaidStatus(transactionStatus)) {
                    if (transactionAmount > 0 && expectedAmount > 0 && transactionAmount < expectedAmount) {
                        await env.DB.prepare(`UPDATE topups SET status = ?, rejectedAt = ?, rejectedReason = ?, dokuTransactionStatus = ?, dokuRawNotification = ? WHERE id = ?`)
                            .bind("rejected", now, `Pembayaran iPaymu kurang dari tagihan: ${transactionAmount}`, transactionStatus, JSON.stringify(notifData), docData.id)
                            .run();

                        return new Response(JSON.stringify({ ok: true, message: "Amount mismatch" }), {
                            status: 200,
                            headers: createCorsHeaders(),
                        });
                    }

                    await env.DB.prepare(`UPDATE topups SET status = ?, approvedAt = ?, dokuTransactionStatus = ?, dokuRawNotification = ? WHERE id = ?`)
                        .bind("approved", now, transactionStatus || "success", JSON.stringify(notifData), docData.id)
                        .run();

                    try {
                        await applyApprovedBilling(env, docData, now, "IPAYMU");
                    } catch (e) {
                        console.error("[IPAYMU] Failed to update user in D1:", e.message);
                    }

                    // Insert Notification
                    if (docData.userId && env.DB) {
                        try {
                            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                            await env.DB.prepare(`INSERT INTO notifications (id, userId, type, title, message, actionUrl) VALUES (?, ?, ?, ?, ?, ?)`)
                                .bind(notifId, docData.userId, "transaction", "Top-up Berhasil", `Pembayaran Anda untuk ${docData.productName || "Top-up"} via iPaymu telah berhasil dikonfirmasi.`, "/dashboard/langganan")
                                .run();
                        } catch (e) {
                            console.error("[IPAYMU] Failed to insert notification:", e.message);
                        }
                    }

                    console.log(`[IPAYMU] Payment SUCCESS processed for reference: ${referenceId}`);
                } else if (isIpaymuFailedStatus(transactionStatus)) {
                    await env.DB.prepare(`UPDATE topups SET status = ?, rejectedAt = ?, rejectedReason = ?, dokuTransactionStatus = ?, dokuRawNotification = ? WHERE id = ?`)
                        .bind("rejected", now, `Pembayaran iPaymu: ${transactionStatus}`, transactionStatus, JSON.stringify(notifData), docData.id)
                        .run();

                    // Insert Notification
                    if (docData.userId && env.DB) {
                        try {
                            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                            await env.DB.prepare(`INSERT INTO notifications (id, userId, type, title, message, actionUrl) VALUES (?, ?, ?, ?, ?, ?)`)
                                .bind(notifId, docData.userId, "transaction", "Top-up Gagal/Expired", `Pembayaran Anda via iPaymu berstatus ${transactionStatus}.`, "/dashboard/langganan")
                                .run();
                        } catch (e) {
                            console.error("[IPAYMU] Failed to insert notification:", e.message);
                        }
                    }

                    console.log(`[IPAYMU] Payment ${transactionStatus} for reference: ${referenceId}`);
                } else {
                    await env.DB.prepare(`UPDATE topups SET dokuTransactionStatus = ?, dokuRawNotification = ? WHERE id = ?`)
                        .bind(transactionStatus || "pending", JSON.stringify(notifData), docData.id)
                        .run();

                    console.log(`[IPAYMU] Pending/unknown status for reference: ${referenceId}`);
                }

                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            } catch (error) {
                console.error("[IPAYMU] Notification processing error:", error.message);
                return new Response(JSON.stringify({ ok: true, error: error.message }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }
        }

        // ──── ENDPOINT: DOKU CREATE PAYMENT ────
        if (isDokuCreatePayment && request.method === "POST") {
            const authToken = extractBearerToken(request);
            const session = await verifyFirebaseToken(authToken, env);
            if (!session) {
                return new Response(JSON.stringify({ error: "Sesi tidak valid. Silakan login ulang." }), {
                    status: 401,
                    headers: createCorsHeaders(),
                });
            }

            const payload = await request.json().catch(() => null);
            if (!payload || !payload.amount || payload.amount <= 0) {
                return new Response(JSON.stringify({ error: "Data pembayaran tidak valid." }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            const doku = getDokuConfig(env);
            if (!doku.clientId || !doku.secretKey) {
                return new Response(JSON.stringify({ error: "DOKU belum dikonfigurasi di server." }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }

            try {
                const invoiceNumber = generateInvoiceNumber();
                const requestId = generateRequestId();
                const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
                const requestTarget = "/checkout/v1/payment";

                const dokuBody = {
                    order: {
                        amount: Math.round(payload.amount),
                        invoice_number: invoiceNumber,
                        callback_url: doku.callbackUrl + "?payment=success&inv=" + invoiceNumber,
                        callback_url_cancel: doku.callbackUrl + "?payment=cancelled",
                        language: "ID",
                        auto_redirect: true,
                        disable_retry_payment: false,
                    },
                    payment: {
                        payment_due_date: payload.paymentDueDate || 60,
                    },
                    customer: {
                        name: payload.customerName || session.email || "Pengguna Skripzy",
                        email: payload.customerEmail || session.email || "",
                    },
                };

                const bodyString = JSON.stringify(dokuBody);
                const signature = await generateDokuSignature(
                    doku.clientId, doku.secretKey, requestId, timestamp, requestTarget, bodyString
                );

                const dokuResponse = await fetch(`${doku.baseUrl}${requestTarget}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Client-Id": doku.clientId,
                        "Request-Id": requestId,
                        "Request-Timestamp": timestamp,
                        "Signature": signature,
                    },
                    body: bodyString,
                });

                const dokuData = await dokuResponse.json().catch(() => ({}));

                if (!dokuResponse.ok) {
                    console.error("[DOKU] Create payment failed:", JSON.stringify(dokuData));
                    return new Response(JSON.stringify({
                        error: dokuData?.error?.message || dokuData?.message || "Gagal membuat pembayaran DOKU.",
                        details: dokuData,
                    }), {
                        status: dokuResponse.status,
                        headers: createCorsHeaders(),
                    });
                }

                const paymentUrl = dokuData?.response?.payment?.url || dokuData?.payment?.url || null;

                // Simpan ke D1 topups table
                const docId = invoiceNumber; // Gunakan invoiceNumber sebagai ID
                const timestampNow = new Date().toISOString();
                
                const stmt = env.DB.prepare(`INSERT INTO topups (
                    id, userId, userName, userEmail, status, requestType, productName, 
                    paymentMethodId, paymentMethodLabel, paymentChannelId, paymentChannelLabel, 
                    paymentChannelGroup, invoiceNumber, dokuRequestId, paymentUrl, promoId, 
                    promoCode, promoType, basePrice, discountAmount, finalPrice, customerNotes, 
                    timestamp, planId, planName, billingPeriod, topupSlug, creditsBase, bonusCredits, amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(
                    docId, session.uid, payload.customerName || session.email || "User Skripzy",
                    session.email || payload.customerEmail || "", "waiting_payment", 
                    payload.requestType || "topup", payload.productName || "", "automatic", 
                    "Pembayaran Otomatis (DOKU)", "doku-checkout", "DOKU Checkout", "gateway",
                    invoiceNumber, requestId, paymentUrl || "", payload.promoId || null,
                    payload.promoCode || null, payload.promoType || null, 
                    Math.round(payload.basePrice || payload.amount || 0), Math.round(payload.discountAmount || 0), 
                    Math.round(payload.amount), "", timestampNow, payload.planId || null, 
                    payload.planName || null, payload.billingPeriod || "monthly", payload.topupSlug || null, 
                    payload.creditsBase || 0, payload.bonusCredits || 0, payload.creditsTotal || payload.amount || 0
                );
                await stmt.run();

                console.log(`[DOKU] Payment created in D1: inv=${invoiceNumber}, docId=${docId}, url=${paymentUrl}`);

                return new Response(JSON.stringify({
                    ok: true,
                    payment_url: paymentUrl,
                    invoice_number: invoiceNumber,
                    doc_id: docId,
                }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });

            } catch (error) {
                console.error("[DOKU] Create payment error:", error.message);
                return new Response(JSON.stringify({ error: error.message || "Gagal memproses pembayaran." }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }
        }

        // ──── ENDPOINT: DOKU NOTIFICATION WEBHOOK ────
        if (isDokuNotification && request.method === "POST") {
            const rawBody = await request.text();
            let notifData;
            try {
                notifData = JSON.parse(rawBody);
            } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON" }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            const doku = getDokuConfig(env);

            // Verify signature (log warning but don't block in sandbox)
            const isValidSignature = await verifyDokuNotificationSignature(
                request.headers, rawBody, doku.clientId, doku.secretKey
            );

            if (!isValidSignature) {
                console.warn("[DOKU] Notification signature mismatch - processing anyway for sandbox");
            }

            const invoiceNumber = notifData?.order?.invoice_number || "";
            const transactionStatus = (notifData?.transaction?.status || "").toUpperCase();
            const transactionAmount = notifData?.order?.amount || 0;

            console.log(`[DOKU] Notification: inv=${invoiceNumber}, status=${transactionStatus}, amount=${transactionAmount}`);

            if (!invoiceNumber) {
                return new Response(JSON.stringify({ ok: true, message: "No invoice number" }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            try {
                // Find the topup doc by invoice number using D1
                const stmt = env.DB.prepare(`SELECT * FROM topups WHERE invoiceNumber = ?`).bind(invoiceNumber);
                const { results } = await stmt.all();
                const matchDoc = results[0];

                if (!matchDoc) {
                    console.warn(`[DOKU] No topup doc found for invoice: ${invoiceNumber}`);
                    return new Response(JSON.stringify({ ok: true, message: "Doc not found" }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                }

                const docData = matchDoc;
                const currentStatus = docData.status;

                // Skip if already processed
                if (currentStatus === "approved" || currentStatus === "rejected") {
                    console.log(`[DOKU] Invoice ${invoiceNumber} already processed as ${currentStatus}`);
                    return new Response(JSON.stringify({ ok: true, message: "Already processed" }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                }

                const now = new Date().toISOString();

                if (transactionStatus === "SUCCESS") {
                    // Update topup doc to approved in D1
                    await env.DB.prepare(`UPDATE topups SET status = ?, approvedAt = ?, dokuTransactionStatus = ?, dokuRawNotification = ? WHERE id = ?`)
                        .bind("approved", now, transactionStatus, JSON.stringify(notifData), docData.id)
                        .run();

                    // Auto-approve: add credits or upgrade plan
                    const userId = docData.userId;
                    if (userId && env.DB) {
                        try {
                            const userStmt = env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(userId);
                            const { results: userResults } = await userStmt.all();
                            const userData = userResults[0];

                            if (userData) {
                                const requestType = docData.requestType || "topup";

                                if (requestType === "plan") {
                                    const planCredits = Number(docData.amount) || 0;
                                    const currentCredits = Number(userData.credits) || 0;

                                    await env.DB.prepare(`UPDATE users SET plan = ?, credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                                        .bind(docData.planId || "pro", currentCredits + planCredits, userId)
                                        .run();

                                    console.log(`[DOKU] Plan upgraded for user ${userId}: ${docData.planId}, +${planCredits} credits (D1)`);
                                } else {
                                    const creditsToAdd = Number(docData.amount) || 0;
                                    const currentCredits = Number(userData.credits) || 0;

                                    await env.DB.prepare(`UPDATE users SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                                        .bind(currentCredits + Math.max(0, creditsToAdd), userId)
                                        .run();

                                    console.log(`[DOKU] Credits added for user ${userId}: +${creditsToAdd} (D1)`);
                                }

                            // Handle promo usage in D1
                            if (docData.promoId) {
                                await env.DB.prepare(`UPDATE promos SET usedCount = usedCount + 1, updatedAt = ? WHERE id = ?`)
                                    .bind(now, docData.promoId)
                                    .run();
                            }
                        }
                        } catch (e) {
                            console.error("[DOKU] Failed to update user in D1:", e.message);
                        }
                    }

                    // Insert Notification
                    if (docData.userId && env.DB) {
                        try {
                            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                            await env.DB.prepare(`INSERT INTO notifications (id, userId, type, title, message, actionUrl) VALUES (?, ?, ?, ?, ?, ?)`)
                                .bind(notifId, docData.userId, "transaction", "Top-up Berhasil", `Pembayaran Anda untuk ${docData.productName || "Top-up"} telah berhasil dikonfirmasi.`, "/dashboard/langganan")
                                .run();
                        } catch (e) {
                            console.error("[DOKU] Failed to insert notification:", e.message);
                        }
                    }

                    console.log(`[DOKU] Payment SUCCESS processed for invoice: ${invoiceNumber}`);
                } else {
                    // Payment failed/expired
                    await env.DB.prepare(`UPDATE topups SET status = ?, rejectedAt = ?, rejectedReason = ?, dokuTransactionStatus = ?, dokuRawNotification = ? WHERE id = ?`)
                        .bind("rejected", now, `Pembayaran DOKU: ${transactionStatus}`, transactionStatus, JSON.stringify(notifData), docData.id)
                        .run();
                        
                    // Insert Notification
                    if (docData.userId && env.DB) {
                        try {
                            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                            await env.DB.prepare(`INSERT INTO notifications (id, userId, type, title, message, actionUrl) VALUES (?, ?, ?, ?, ?, ?)`)
                                .bind(notifId, docData.userId, "transaction", "Top-up Gagal/Expired", `Pembayaran Anda untuk invoice ${invoiceNumber} berstatus ${transactionStatus}.`, "/dashboard/langganan")
                                .run();
                        } catch (e) {
                            console.error("[DOKU] Failed to insert notification:", e.message);
                        }
                    }

                    console.log(`[DOKU] Payment ${transactionStatus} for invoice: ${invoiceNumber}`);
                }

                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            } catch (error) {
                console.error("[DOKU] Notification processing error:", error.message);
                // Return 200 anyway so DOKU doesn't retry
                return new Response(JSON.stringify({ ok: true, error: error.message }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }
        }

        // ──── ENDPOINT: DOKU TEST CONNECTION (FOR DEBUGGING) ────
        const isDokuTest = url.pathname === "/api/doku/test-connection";
        if (isDokuTest && request.method === "POST") {
            const doku = getDokuConfig(env);
            if (!doku.clientId || !doku.secretKey) {
                return new Response(JSON.stringify({
                    error: "DOKU credentials not configured",
                    clientId: doku.clientId || "missing",
                    secretKey: doku.secretKey ? "configured" : "missing",
                }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            try {
                const testBody = {
                    order: {
                        amount: 10000,
                        invoice_number: `TEST-${Date.now()}`,
                        callback_url: doku.callbackUrl,
                        language: "ID",
                        auto_redirect: true,
                    },
                    payment: { payment_due_date: 60 },
                    customer: { name: "Test User", email: "test@skripzy.id" },
                };

                const requestId = generateRequestId();
                const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
                const requestTarget = "/checkout/v1/payment";
                const bodyString = JSON.stringify(testBody);

                const signature = await generateDokuSignature(
                    doku.clientId, doku.secretKey, requestId, timestamp, requestTarget, bodyString
                );

                console.log(`[DOKU TEST] Signature: ${signature}`);
                console.log(`[DOKU TEST] ClientId: ${doku.clientId}`);

                const dokuResponse = await fetch(`${doku.baseUrl}${requestTarget}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Client-Id": doku.clientId,
                        "Request-Id": requestId,
                        "Request-Timestamp": timestamp,
                        "Signature": signature,
                    },
                    body: bodyString,
                });

                const dokuData = await dokuResponse.json().catch(() => ({}));

                return new Response(JSON.stringify({
                    ok: dokuResponse.ok,
                    status: dokuResponse.status,
                    signature: signature,
                    clientId: doku.clientId,
                    requestId: requestId,
                    timestamp: timestamp,
                    response: dokuData,
                }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            } catch (error) {
                console.error("[DOKU TEST] Error:", error.message);
                return new Response(JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }
        }

        if (isPublicFormEndpoint) {
            const slug = parsePublicFormSlug(url.pathname);
            if (!slug) {
                return new Response(JSON.stringify({ error: "Slug form tidak valid." }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            if (request.method === "GET" && !url.pathname.endsWith("/responses")) {
                const stmt = env.DB.prepare(`
                    SELECT * FROM workspace_forms 
                    WHERE status = 'published' AND content LIKE ?
                    LIMIT 1
                `).bind(`%"publicSlug":"${slug}"%`);
                const publicForm = await stmt.first();

                if (!publicForm) {
                    return new Response(JSON.stringify({ error: "Form publik tidak ditemukan." }), {
                        status: 404,
                        headers: createCorsHeaders(),
                    });
                }

                let content = {};
                try {
                    content = typeof publicForm.content === "string" ? JSON.parse(publicForm.content) : (publicForm.content || {});
                } catch (e) {}

                const responseData = {
                    form: {
                        workspaceId: publicForm.workspace_id,
                        formId: publicForm.id,
                        title: publicForm.title || "Form Tanpa Judul",
                        description: content.description || "",
                        publicSlug: content.publicSlug || slug,
                        settings: content.settings || {},
                        sections: content.sections || [],
                        publishedAt: content.publishedAt || publicForm.updated_at,
                        status: publicForm.status,
                    }
                };

                return new Response(JSON.stringify(responseData), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            if (request.method === "POST" && url.pathname.endsWith("/responses")) {
                const stmt = env.DB.prepare(`
                    SELECT * FROM workspace_forms 
                    WHERE status = 'published' AND content LIKE ?
                    LIMIT 1
                `).bind(`%"publicSlug":"${slug}"%`);
                const publicForm = await stmt.first();

                if (!publicForm) {
                    return new Response(JSON.stringify({ error: "Form publik tidak aktif atau tidak ditemukan." }), {
                        status: 404,
                        headers: createCorsHeaders(),
                    });
                }

                const payload = await request.json().catch(() => null);
                if (!payload?.answers || typeof payload.answers !== "object") {
                    return new Response(JSON.stringify({ error: "Jawaban form tidak valid." }), {
                        status: 400,
                        headers: createCorsHeaders(),
                    });
                }

                const responseId = crypto.randomUUID();
                const insertStmt = env.DB.prepare(`
                    INSERT INTO workspace_form_responses (
                        id, user_id, form_id, workspace_id, answers, answersLabeled, submittedFrom, metadata, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                    responseId,
                    publicForm.user_id,
                    publicForm.id,
                    publicForm.workspace_id,
                    JSON.stringify(payload.answers),
                    JSON.stringify(payload.answersLabeled || {}),
                    "public-form",
                    JSON.stringify({
                        userAgent: request.headers.get("User-Agent") || "",
                        locale: payload.locale || "",
                    })
                );
                await insertStmt.run();

                // Update responseCount in workspaces
                try {
                    await env.DB.prepare(`
                        UPDATE workspaces 
                        SET responseCount = (
                            SELECT COUNT(*) FROM workspace_form_responses WHERE workspace_id = ?
                        ) 
                        WHERE id = ?
                    `).bind(publicForm.workspace_id, publicForm.workspace_id).run();
                } catch (err) {
                    console.error("Gagal update responseCount:", err);
                }

                return new Response(JSON.stringify({
                    ok: true,
                    responseId: responseId,
                }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }
        }

        if (isWorkspacePublishEndpoint) {
            const authToken = extractBearerToken(request);
            const session = await verifyFirebaseToken(authToken, env);
            if (!session) {
                return new Response(JSON.stringify({ error: "Sesi owner tidak valid." }), {
                    status: 401,
                    headers: createCorsHeaders(),
                });
            }

            const payload = await request.json().catch(() => null);
            const slug = slugify(payload?.slug || payload?.snapshot?.publicSlug || "");
            if (!slug) {
                return new Response(JSON.stringify({ error: "Slug publik wajib diisi." }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            if (payload?.mode === "unpublish") {
                await env.DB.prepare(`
                    UPDATE workspace_forms 
                    SET status = 'draft', updated_at = CURRENT_TIMESTAMP
                    WHERE content LIKE ? AND user_id = ?
                `).bind(`%"publicSlug":"${slug}"%`, session.uid).run();

                return new Response(JSON.stringify({ ok: true, mode: "unpublish", slug }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            const snapshot = payload?.snapshot;
            if (!snapshot || !snapshot.formId) {
                return new Response(JSON.stringify({ error: "Snapshot form tidak valid." }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            const checkStmt = env.DB.prepare(`
                SELECT * FROM workspace_forms WHERE id = ? AND user_id = ?
            `).bind(snapshot.formId, session.uid);
            const existingForm = await checkStmt.first();
            if (!existingForm) {
                return new Response(JSON.stringify({ error: "Form tidak ditemukan atau Anda bukan pemiliknya." }), {
                    status: 404,
                    headers: createCorsHeaders(),
                });
            }

            const updatedContent = JSON.stringify({
                description: snapshot.description || "",
                publicSlug: slug,
                settings: snapshot.settings || {},
                sections: snapshot.sections || [],
                publishedAt: snapshot.publishedAt || new Date().toISOString(),
            });

            await env.DB.prepare(`
                UPDATE workspace_forms 
                SET status = 'published', content = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            `).bind(updatedContent, snapshot.formId, session.uid).run();

            return new Response(JSON.stringify({ ok: true, slug }), {
                status: 200,
                headers: createCorsHeaders(),
            });
        }

        if (isWorkspaceAiEndpoint) {
            const authToken = extractBearerToken(request);
            const session = await verifyFirebaseToken(authToken, env);
            if (!session) {
                return new Response(JSON.stringify({ error: "Sesi owner tidak valid." }), {
                    status: 401,
                    headers: createCorsHeaders(),
                });
            }

            const payload = await request.json().catch(() => null);
            if (!payload?.prompt) {
                return new Response(JSON.stringify({ error: "Prompt AI workspace wajib diisi." }), {
                    status: 400,
                    headers: createCorsHeaders(),
                });
            }

            try {
                const result = await proxyGeminiGeneration({
                    env,
                    ctx,
                    body: payload,
                    groupHeader: payload.group || "group_3",
                    model: payload.model || "gemini-2.5-flash",
                    systemInstruction: payload.systemInstruction || "Anda adalah co-writer akademik Skripzy. Jawab dalam bahasa Indonesia akademik yang jelas, terstruktur, dan siap ditempel ke draft skripsi.",
                    temperature: typeof payload.temperature === "number" ? payload.temperature : 0.65,
                });

                return new Response(JSON.stringify({
                    ok: true,
                    uid: session.uid,
                    text: result.text,
                    model: result.model,
                }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message || "Gagal menghasilkan konten AI workspace." }), {
                    status: 500,
                    headers: createCorsHeaders(),
                });
            }
        }

        // ──── ENDPOINT BARU: CLOUDFLARE D1 CRUD API ────
        if (url.pathname.startsWith("/api/d1/")) {
            const table = url.pathname.replace("/api/d1/", "").split("/")[0];
            const allowedTables = [
                "users", "workspaces", "document_metadata",
                "workspace_references", "workspace_forms", "workspace_form_responses", "workspace_transcripts",
                "workspace_analysis", "workspace_notes", "notebooks",
                "topups", "promos", "pricing", "notifications"
            ];
            if (!allowedTables.includes(table)) {
                return new Response(JSON.stringify({ error: "Table not allowed" }), { status: 403, headers: createCorsHeaders() });
            }

            const isPublicRead = request.method === "GET" && ["pricing", "promos"].includes(table);
            
            let session = null;
            if (!isPublicRead) {
                const authToken = extractBearerToken(request);
                session = await verifyFirebaseToken(authToken, env);
                if (!session) {
                    return new Response(JSON.stringify({ error: "Unauthorized: Invalid Firebase token" }), { status: 401, headers: createCorsHeaders() });
                }
            }

            if (!env.DB) {
                return new Response(JSON.stringify({ error: "D1 Database not bound" }), { status: 500, headers: createCorsHeaders() });
            }

            // Global tables that don't have user_id / aren't scoped by user
            const isGlobalAdminTable = ["promos", "pricing"].includes(table);
            const uidColumn = table === "users" ? "id" : (table === "topups" || table === "notifications" ? "userId" : "user_id");

            // Ambil role user dari db
            let userRole = "user";
            if (session) {
                try {
                    const roleStmt = env.DB.prepare(`SELECT role FROM users WHERE id = ?`).bind(session.uid);
                    const roleResult = await roleStmt.first();
                    if (roleResult && roleResult.role) {
                        userRole = roleResult.role;
                    }
                } catch (e) {
                    console.warn("Failed to fetch user role", e);
                }
            }
            const isAdmin = userRole === "admin";

            try {
                if (request.method === "GET") {
                    const id = url.searchParams.get("id");
                    if (id) {
                        let query = `SELECT * FROM ${table} WHERE id = ?`;
                        let params = [id];
                        if (table === "notifications" && !isAdmin) {
                            query += ` AND (userId = ? OR userId IS NULL)`;
                            params.push(session.uid);
                        } else if (!isGlobalAdminTable && !isAdmin) {
                            query += ` AND ${uidColumn} = ?`;
                            params.push(session.uid);
                        }
                        const stmt = env.DB.prepare(query).bind(...params);
                        const { results } = await stmt.all();
                        return new Response(JSON.stringify({ data: results[0] || null }), { headers: createCorsHeaders() });
                    } else {
                        let query = `SELECT * FROM ${table}`;
                        let params = [];
                        if (table === "notifications" && !isAdmin) {
                            query += ` WHERE (userId = ? OR userId IS NULL)`;
                            params.push(session.uid);
                        } else if (!isGlobalAdminTable && !isAdmin) {
                            query += ` WHERE ${uidColumn} = ?`;
                            params.push(session.uid);
                        } else if (table === "topups" && !isAdmin) {
                            query += ` WHERE userId = ?`;
                            params.push(session.uid);
                        }
                        const stmt = env.DB.prepare(query).bind(...params);
                        const { results } = await stmt.all();
                        return new Response(JSON.stringify({ data: results }), { headers: createCorsHeaders() });
                    }
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    
                    if (table === "users") {
                        body.id = session.uid;
                    } else if (table === "topups" || table === "notifications") {
                        body.userId = session.uid;
                    } else if (!isGlobalAdminTable) {
                        body.user_id = session.uid;
                    }

                    const keys = Object.keys(body);
                    const placeholders = keys.map(() => "?").join(", ");
                    const values = keys.map(k => body[k]);
                    const stmt = env.DB.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`).bind(...values);
                    const result = await stmt.run();
                    return new Response(JSON.stringify({ success: true, result }), { headers: createCorsHeaders() });
                }

                if (request.method === "PATCH") {
                    const id = url.searchParams.get("id");
                    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: createCorsHeaders() });
                    const body = await request.json();
                    
                    delete body.user_id;
                    delete body.userId;
                    delete body.id;

                    const keys = Object.keys(body);
                    if (keys.length === 0) return new Response(JSON.stringify({ success: true }), { headers: createCorsHeaders() });

                    const hasUpdatedAt = table === "users" || table === "workspaces";
                    const setClause = keys.map(k => `${k} = ?`).join(", ") + (hasUpdatedAt ? ", updated_at = CURRENT_TIMESTAMP" : "");
                    const values = keys.map(k => body[k]);

                    let updateQuery = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
                    let updateParams = [...values, id];
                    if (!isGlobalAdminTable && !isAdmin) {
                        updateQuery += ` AND ${uidColumn} = ?`;
                        updateParams.push(session.uid);
                    }

                    const stmt = env.DB.prepare(updateQuery).bind(...updateParams);
                    
                    const result = await stmt.run();
                    return new Response(JSON.stringify({ success: true, result }), { headers: createCorsHeaders() });
                }

                if (request.method === "DELETE") {
                    const id = url.searchParams.get("id");
                    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: createCorsHeaders() });
                    
                    let query = `DELETE FROM ${table} WHERE id = ?`;
                    let params = [id];
                    if (!isGlobalAdminTable && !isAdmin) {
                        query += ` AND ${uidColumn} = ?`;
                        params.push(session.uid);
                    }
                    
                    const stmt = env.DB.prepare(query).bind(...params);
                    const result = await stmt.run();
                    return new Response(JSON.stringify({ success: true, result }), { headers: createCorsHeaders() });
                }

                return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: createCorsHeaders() });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: createCorsHeaders() });
            }
        }

        // 2. Keamanan Sederhana: Memakai Custom Secret
        const EXPECTED_SECRET = env.WORKER_SECRET || "skripzy1234";

        // Cek secret dari Header (REST) ATAU Query Param (WebSocket dari browser)
        const incomingSecret = request.headers.get("x-skripzy-secret") || url.searchParams.get("secret");

        if (incomingSecret !== EXPECTED_SECRET) {
            return new Response(JSON.stringify({ error: "Unauthorized access to Skripzy Engine" }), {
                status: 401,
                headers: createCorsHeaders(),
            });
        }

        try {
            // ──── ENDPOINT BARU: GROQ FALLBACK ────
            if (url.pathname === "/api/ai/groq" && request.method === "POST") {
                const payload = await request.json().catch(() => null);
                if (!payload || !payload.prompt) {
                    return new Response(JSON.stringify({ error: "Prompt required" }), { status: 400, headers: createCorsHeaders() });
                }
                try {
                    const result = await internalGroqFallback(env, payload.prompt, payload.history, payload.systemInstruction, payload.temperature);
                    return new Response(JSON.stringify(result), { status: 200, headers: createCorsHeaders() });
                } catch (error) {
                    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: createCorsHeaders() });
                }
            }

            // ──── ENDPOINT BARU: GENERATE CLOUDINARY SIGNATURE ────
            if (url.pathname === "/api/cloudinary-sign" && request.method === "POST") {
                const payload = await request.json().catch(() => ({}));
                const folderName = payload.folder || "Referensi";
                
                const timestamp = Math.round((new Date).getTime() / 1000);

                // Kita mengurutkan parameter sesuai standar Cloudinary, tambahkan folder
                const paramsToSign = {
                    folder: folderName,
                    timestamp: timestamp
                };
                const keys = Object.keys(paramsToSign).sort();
                // Menggabungkan parameter & menyambungnya dengan API Secret
                const stringToSign = keys.map(k => `${k}=${paramsToSign[k]}`).join('&') + (env.CLOUDINARY_API_SECRET || "");

                // Membuat SHA-1 hash menggunakan Web Crypto API (karena di lingkungan Cloudflare Worker)
                const msgBuffer = new TextEncoder().encode(stringToSign);
                const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                return new Response(JSON.stringify({
                    signature,
                    timestamp,
                    cloudName: env.CLOUDINARY_CLOUD_NAME,
                    apiKey: env.CLOUDINARY_API_KEY
                }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            // ──── ENDPOINT BARU: DELETE CLOUDINARY FILE ────
            if (url.pathname === "/api/cloudinary-delete" && request.method === "POST") {
                const { publicId } = await request.json();

                if (!publicId) {
                    return new Response(JSON.stringify({ error: "publicId required" }), { status: 400, headers: createCorsHeaders() });
                }

                const timestamp = Math.round((new Date).getTime() / 1000);
                const paramsToSign = { public_id: publicId, timestamp };
                const keys = Object.keys(paramsToSign).sort();
                const stringToSign = keys.map(k => `${k}=${paramsToSign[k]}`).join('&') + (env.CLOUDINARY_API_SECRET || "");

                const msgBuffer = new TextEncoder().encode(stringToSign);
                const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
                const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

                const formData = new FormData();
                formData.append("public_id", publicId);
                formData.append("signature", signature);
                formData.append("timestamp", timestamp);
                formData.append("api_key", env.CLOUDINARY_API_KEY);

                const delRes = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
                    method: "POST",
                    body: formData
                });

                return new Response(JSON.stringify(await delRes.json()), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            // ──── ENDPOINT BARU: ADMIN API USAGE ────
            if (url.pathname === "/api/admin/api-usage" && request.method === "GET") {
                if (!env.DB) {
                    return new Response(JSON.stringify({ error: "D1 database not bound" }), { status: 500, headers: createCorsHeaders() });
                }

                try {
                    // Aggregation query: Usage per day (Pacific Time), per model, per API key
                    const stmt = env.DB.prepare(`
                        SELECT 
                            date(timestamp, '-8 hours') as date,
                            model_name,
                            api_key,
                            SUM(requests_count) as total_requests,
                            SUM(tokens_used) as total_tokens
                        FROM api_usage
                        GROUP BY date, model_name, api_key
                        ORDER BY date DESC, total_requests DESC
                        LIMIT 200
                    `);
                    
                    const { results } = await stmt.all();
                    
                    return new Response(JSON.stringify({ success: true, data: results }), {
                        status: 200,
                        headers: createCorsHeaders()
                    });
                } catch (err) {
                    return new Response(JSON.stringify({ error: err.message }), {
                        status: 500,
                        headers: createCorsHeaders()
                    });
                }
            }

            // ──── ENDPOINT BARU: BATCH EMBEDDING UNTUK RAG ────
            if (url.pathname === "/api/ai/embed-batch" && request.method === "POST") {
                const { texts, model = "gemini-embedding-2" } = await request.json();

                if (!texts || !Array.isArray(texts)) {
                    return new Response(JSON.stringify({ error: "Texts array required" }), {
                        status: 400, headers: createCorsHeaders()
                    });
                }

                // Siapkan payload untuk Google Batch API (Max 100 per request)
                const payload = {
                    requests: texts.map(t => ({
                        model: `models/${model}`,
                        content: { parts: [{ text: t }] },
                        outputDimensionality: 768
                    }))
                };

                const groupHeader = request.headers.get("x-api-group") || "group_3";
                const groupsToTry = groupHeader.split(",").map(g => g.trim()).filter(Boolean);

                const API_GROUPS = getApiGroups(env);
                let lastError = null;
                for (const group of groupsToTry) {
                    const keys = (API_GROUPS[group] || []).filter(k => k.key);
                    for (const keyObj of keys) {
                        const res = await fetch(`https://gateway.ai.cloudflare.com/v1/094df8c8c682a53ca0a27d87735baa51/skripzy-ai/google-ai-studio/v1beta/models/${model}:batchEmbedContents?key=${keyObj.key}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });

                        if (res.ok) {
                            const data = await res.json();
                            const embeddings = data.embeddings.map(e => e.values);
                            return new Response(JSON.stringify({ embeddings }), {
                                status: 200, headers: createCorsHeaders()
                            });
                        }

                        const errText = await res.text();
                        lastError = { status: res.status, body: errText };
                        if (!RETRYABLE_STATUS.has(res.status)) break;
                    }
                }

                return new Response(JSON.stringify({ error: "Batch embedding failed", details: lastError }), {
                    status: lastError?.status || 500, headers: createCorsHeaders()
                });
            }

            // ──── ENDPOINT BARU: VECTORIZE UPSERT ────
            if (url.pathname === "/api/vector/upsert" && request.method === "POST") {
                if (!env.VECTOR_INDEX) {
                    return new Response(JSON.stringify({ error: "Vectorize not bound" }), { status: 500, headers: createCorsHeaders() });
                }
                const { vectors } = await request.json(); // [{ id, values, metadata }]

                if (!vectors || !Array.isArray(vectors)) {
                    return new Response(JSON.stringify({ error: "Invalid vectors array" }), { status: 400, headers: createCorsHeaders() });
                }

                try {
                    const result = await env.VECTOR_INDEX.insert(vectors);
                    return new Response(JSON.stringify({ success: true, result }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: createCorsHeaders() });
                }
            }

            // ──── ENDPOINT BARU: VECTORIZE QUERY ────
            if (url.pathname === "/api/vector/query" && request.method === "POST") {
                if (!env.VECTOR_INDEX) {
                    return new Response(JSON.stringify({ error: "Vectorize not bound" }), { status: 500, headers: createCorsHeaders() });
                }
                const { vector, topK = 10, filter, returnMetadata = true } = await request.json();

                if (!vector || !Array.isArray(vector)) {
                    return new Response(JSON.stringify({ error: "Invalid query vector" }), { status: 400, headers: createCorsHeaders() });
                }

                try {
                    const options = { topK, returnMetadata };
                    if (filter) {
                        options.filter = filter;
                    }
                    const queryResult = await env.VECTOR_INDEX.query(vector, options);
                    return new Response(JSON.stringify(queryResult), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: createCorsHeaders() });
                }
            }

            // ──── ENDPOINT BARU: WEBSOCKET PROXY UNTUK GEMINI LIVE ────
            if (url.pathname === "/ws/gemini-live") {
                const upgradeHeader = request.headers.get("Upgrade");
                if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
                    return new Response("Expected Upgrade: websocket", { status: 426 });
                }

                const groupRequested = url.searchParams.get("group") || "group_4";
                const API_GROUPS = getApiGroups(env);
                const targetKeys = API_GROUPS[groupRequested] || API_GROUPS["group_4"];
                const usableKeys = targetKeys.filter(k => k.key);

                if (usableKeys.length === 0) {
                    return new Response("Grup API tidak memiliki key yang valid.", { status: 500 });
                }

                // Ambil key pertama yang tersedia untuk sesi telepon ini
                const apiKey = usableKeys[0].key;

                // Bypass AI Gateway karena belum mendukung WebSocket untuk Gemini Live
                const targetUrl = `https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

                return fetch(targetUrl, request);
            }

            // ──── ENDPOINT: SEARCH REFERENCE - CORE API ────
            if (url.pathname === "/api/search/core" && request.method === "POST") {
                const { query, limit = 10, yearFrom, yearTo } = await request.json();

                if (!query) {
                    return new Response(JSON.stringify({ error: "Query required", results: [] }), {
                        status: 400,
                        headers: createCorsHeaders(),
                    });
                }

                const coreApiKey = env.CORE_API_KEY;
                if (!coreApiKey) {
                    return new Response(JSON.stringify({ error: "Core API key not configured", results: [] }), {
                        status: 500,
                        headers: createCorsHeaders(),
                    });
                }

                try {
                    let coreUrl = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}&api_key=${coreApiKey}`;

                    // Add year filtering if provided
                    if (yearFrom && yearTo) {
                        coreUrl += `&yearFrom=${yearFrom}&yearTo=${yearTo}`;
                    }

                    console.log(`[Core API] Fetching: ${query} (${yearFrom}-${yearTo})`);
                    const coreResponse = await fetch(coreUrl, { method: "GET" });

                    if (!coreResponse.ok) {
                        const errorText = await coreResponse.text();
                        throw new Error(`Core API returned ${coreResponse.status}: ${errorText}`);
                    }

                    const coreData = await coreResponse.json();
                    const results = (coreData.results || []).slice(0, limit);

                    return new Response(JSON.stringify({ results }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                } catch (e) {
                    console.error("[Core API Error]", e.message);
                    return new Response(JSON.stringify({ error: e.message, results: [] }), {
                        status: 500,
                        headers: createCorsHeaders(),
                    });
                }
            }

            // ──── ENDPOINT: SEARCH REFERENCE - OPENALEX API ────
            if (url.pathname === "/api/search/openalex" && request.method === "POST") {
                const { query, limit = 10, yearFrom, yearTo } = await request.json();

                if (!query) {
                    return new Response(JSON.stringify({ error: "Query required", results: [] }), {
                        status: 400,
                        headers: createCorsHeaders(),
                    });
                }

                try {
                    const perPage = Math.min(limit, 50);
                    let openalexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${perPage}`;

                    // FIX UTAMA:
                    // OpenAlex tidak memakai publication_year:2020-2025.
                    // Untuk range tahun harus pakai from_publication_date dan to_publication_date.
                    // Helper function for OpenAlex date filtering
                    const buildOpenAlexDateFilter = (from, to) => {
                        const filters = [];
                        if (from) filters.push(`from_publication_date:${from}-01-01`);
                        if (to) filters.push(`to_publication_date:${to}-12-31`);
                        return filters.join(",");
                    };

                    const dateFilter = buildOpenAlexDateFilter(yearFrom, yearTo);
                    if (dateFilter) {
                        openalexUrl += `&filter=${encodeURIComponent(dateFilter)}`;
                    }

                    // Sort terbaru dulu agar hasil lebih relevan secara temporal.
                    openalexUrl += `&sort=publication_date:desc`;

                    console.log(`[OpenAlex API] Fetching: ${query} (${yearFrom}-${yearTo})`);
                    const openalexResponse = await fetch(openalexUrl, { method: "GET" });

                    if (!openalexResponse.ok) {
                        const errorText = await openalexResponse.text();
                        throw new Error(`OpenAlex API returned ${openalexResponse.status}: ${errorText}`);
                    }

                    const openalexData = await openalexResponse.json();
                    const results = (openalexData.results || []).slice(0, limit);

                    return new Response(JSON.stringify({ results }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                } catch (e) {
                    console.error("[OpenAlex API Error]", e.message);
                    return new Response(JSON.stringify({ error: e.message, results: [] }), {
                        status: 500,
                        headers: createCorsHeaders(),
                    });
                }
            }

            // ──── ENDPOINT: SEARCH REFERENCE - UNPAYWALL API ────
            if (url.pathname === "/api/search/unpaywall" && request.method === "POST") {
                const { query, limit = 10, yearFrom, yearTo } = await request.json();

                if (!query) {
                    return new Response(JSON.stringify({ error: "Query required", results: [] }), {
                        status: 400,
                        headers: createCorsHeaders(),
                    });
                }

                try {
                    // Unpaywall doesn't support direct search well, use simple approach
                    const unpaywallEmail = "officialskripzy@gmail.com";
                    let unpaywallUrl = `https://api.unpaywall.org/v2/search?query=${encodeURIComponent(query)}&email=${encodeURIComponent(unpaywallEmail)}&limit=${Math.min(limit, 50)}`;

                    console.log(`[Unpaywall API] Fetching: ${query}`);
                    const unpaywallResponse = await fetch(unpaywallUrl, { method: "GET" });

                    if (!unpaywallResponse.ok) {
                        const errorText = await unpaywallResponse.text();
                        throw new Error(`Unpaywall API returned ${unpaywallResponse.status}: ${errorText}`);
                    }

                    const unpaywallData = await unpaywallResponse.json();
                    const results = (unpaywallData.results || []).slice(0, limit);

                    return new Response(JSON.stringify({ results }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                } catch (e) {
                    console.error("[Unpaywall API Error]", e.message);
                    return new Response(JSON.stringify({ error: e.message, results: [] }), {
                        status: 500,
                        headers: createCorsHeaders(),
                    });
                }
            }

            // ──── ENDPOINT: OCR RECEIPT (AI VISION) ────
            if (url.pathname === "/api/ocr-receipt" && request.method === "POST") {
                const payload = await request.json().catch(() => null);
                if (!payload || !payload.proofUrl || !payload.targetPrice || !payload.paymentChannelId) {
                    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                        status: 400,
                        headers: createCorsHeaders(),
                    });
                }

                try {
                    // Fetch the image
                    const imageRes = await fetch(payload.proofUrl);
                    if (!imageRes.ok) throw new Error("Gagal mengunduh gambar bukti");
                    
                    const arrayBuffer = await imageRes.arrayBuffer();
                    let mimeType = "image/jpeg";
                    const lowerUrl = payload.proofUrl.toLowerCase();
                    if (lowerUrl.endsWith(".png")) mimeType = "image/png";
                    if (lowerUrl.endsWith(".webp")) mimeType = "image/webp";
                    if (lowerUrl.endsWith(".pdf")) mimeType = "application/pdf";

                    // Convert to Base64
                    const bytes = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64Data = btoa(binary);

                    const systemInstruction = `Kamu adalah analis keuangan ahli spesialis pencegahan fraud (anti-fraud expert). Tugasmu adalah memverifikasi bukti transfer (top-up) dengan sangat ketat dan mengembalikan hasil analisis dalam format JSON murni.

Informasi Target:
- Nominal yang diharapkan: Rp ${payload.targetPrice}
- Channel Pembayaran: ${payload.paymentChannelId}
  (Jika channel terkait QRIS, pastikan merchant penerima valid. Jika bank/ewallet, pastikan tujuan benar.)

Langkah Pengecekan:
1. Ekstrak Nominal: Cari nominal transfer.
2. Cek Penerima & Channel.
3. Ekstrak Nomor Referensi: Cari No Referensi / ID Transaksi / RRN.
4. Pengecekan FRAUD / EDITAN: Periksa secara teliti indikasi gambar diedit (Photoshop/pemalsuan). Perhatikan ketidakselarasan font ukuran/warna/jenis, bayangan, atau artefak kompresi yang janggal. Jika ada indikasi, tandai isEdited: true.

Beri skor (0-100). (Nominal cocok = +50, Penerima/Channel cocok = +30, Transaksi Sukses = +20). Jika isEdited true, skor maksimal adalah 0.

OUTPUT FORMAT HANYA JSON:
{
  "score": (integer 0-100),
  "extractedRef": "(string)",
  "reasons": ["(string, daftar alasan skor/penilaian)"],
  "ocrText": "(string, ringkasan teks mentah penting yang terbaca)",
  "confidence": (integer 0-100),
  "isEdited": (boolean)
}`;

                    const geminiPayload = {
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: "Verifikasi bukti transfer ini secara teliti dan waspadai editan gambar." },
                                    { inlineData: { mimeType, data: base64Data } }
                                ]
                            }
                        ],
                        systemInstruction: { parts: [{ text: systemInstruction }] },
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.1
                        }
                    };

                    const groupHeader = request.headers.get("x-api-group") || "group_4";
                    const requestedGroups = groupHeader.split(",").map((item) => item.trim()).filter(Boolean);
                    const finalGroups = requestedGroups.length ? requestedGroups : ["group_4"];

                    // Gunakan model 2.5 flash untuk kemampuan vision & reasoning yang lebih baik
                    const response = await executeGeminiWithRotation(
                        env,
                        ctx,
                        finalGroups,
                        "gemini-2.5-flash", 
                        false,
                        JSON.stringify(geminiPayload),
                        "SYSTEM",
                        "OCR",
                        true // forceSingleModel agar rotasi fokus ke 2.5 flash
                    );

                    if (!response.ok) {
                        const err = await response.text();
                        throw new Error("AI Endpoint gagal memproses gambar: " + err);
                    }

                    const data = await response.json();
                    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                    if (text.startsWith("\`\`\`json")) text = text.replace(/^\`\`\`json/, "").replace(/\`\`\`$/, "").trim();
                    
                    let parsedOutput = { score: 0, extractedRef: "", reasons: [], ocrText: "", confidence: 0, isEdited: false };
                    if (text) {
                        try { parsedOutput = JSON.parse(text); } catch (e) {
                            parsedOutput.reasons.push("Gagal mem-parsing format JSON AI.");
                            parsedOutput.ocrText = text.substring(0, 200);
                        }
                    } else {
                        parsedOutput.reasons.push("AI tidak mengembalikan teks.");
                    }

                    return new Response(JSON.stringify(parsedOutput), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                } catch (e) {
                    console.error("[OCR Receipt Error]", e.message);
                    return new Response(JSON.stringify({ error: e.message }), {
                        status: 500,
                        headers: createCorsHeaders(),
                    });
                }
            }

            // ──── ENDPOINT REST API (GENERATE CONTENT BIASA) ────
            const groupHeader = request.headers.get("x-api-group") || "group_4";
            const requestedGroups = groupHeader.split(",").map((item) => item.trim()).filter(Boolean);
            const groupsToTry = requestedGroups.length ? requestedGroups : ["group_4"];

            if (request.method !== "POST") {
                return new Response(JSON.stringify({ error: "Method not allowed" }), {
                    status: 405,
                    headers: createCorsHeaders(),
                });
            }

            const isStream = url.searchParams.get("alt") === "sse";
            const payload = await request.text();

            const modelMatch = url.pathname.match(/\/models\/([^:]+):/);
            const urlModel = modelMatch ? modelMatch[1] : "gemini-flash-latest";
            
            // Hanya gunakan 1 model jika ini adalah embedding atau Chat Dosen (lite)
            const forceSingleModel = url.pathname.includes("embedContent") || url.pathname.includes("embedding") || urlModel === "gemini-flash-lite-latest";

            return await executeGeminiWithRotation(
                env, 
                ctx,
                groupsToTry, 
                urlModel, 
                isStream, 
                payload, 
                clientColo, 
                clientCountry,
                forceSingleModel
            );

        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: createCorsHeaders(),
            });
        }
    },
};

export default worker;
