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

    const { webApiKey } = getFirebaseConfig(env);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json().catch(() => ({}));
    const user = data?.users?.[0];
    if (!user?.localId) return null;

    return {
        uid: user.localId,
        email: user.email || "",
    };
}

function toFirestoreValue(value) {
    if (value === null || value === undefined) {
        return { nullValue: null };
    }

    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map((entry) => toFirestoreValue(entry)),
            },
        };
    }

    if (typeof value === "object") {
        const fields = {};
        Object.entries(value).forEach(([key, entry]) => {
            if (entry === undefined) return;
            fields[key] = toFirestoreValue(entry);
        });
        return {
            mapValue: { fields },
        };
    }

    if (typeof value === "boolean") {
        return { booleanValue: value };
    }

    if (typeof value === "number") {
        if (Number.isInteger(value)) {
            return { integerValue: String(value) };
        }
        return { doubleValue: value };
    }

    return { stringValue: String(value) };
}

function toFirestoreDocument(payload = {}) {
    const fields = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return;
        fields[key] = toFirestoreValue(value);
    });
    return { fields };
}

function fromFirestoreValue(value) {
    if (value === null || value === undefined) return null;
    if ("stringValue" in value) return value.stringValue;
    if ("integerValue" in value) return Number(value.integerValue);
    if ("doubleValue" in value) return value.doubleValue;
    if ("booleanValue" in value) return value.booleanValue;
    if ("timestampValue" in value) return value.timestampValue;
    if ("nullValue" in value) return null;
    if ("arrayValue" in value) {
        return (value.arrayValue.values || []).map((entry) => fromFirestoreValue(entry));
    }
    if ("mapValue" in value) {
        const result = {};
        Object.entries(value.mapValue.fields || {}).forEach(([key, entry]) => {
            result[key] = fromFirestoreValue(entry);
        });
        return result;
    }
    return null;
}

function fromFirestoreDocument(document) {
    const plain = {};
    Object.entries(document?.fields || {}).forEach(([key, value]) => {
        plain[key] = fromFirestoreValue(value);
    });
    plain.id = document?.name?.split("/").pop() || null;
    return plain;
}

async function firestoreRequest(env, path, { method = "GET", authToken = null, body = null, query = "" } = {}) {
    const { projectId, webApiKey } = getFirebaseConfig(env);
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`;
    const url = `${baseUrl}${query ? `?${query}` : `?key=${webApiKey}`}`;
    const headers = {
        "Content-Type": "application/json",
    };

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    return fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
}

function parsePublicFormSlug(pathname) {
    const match = pathname.match(/^\/public\/forms\/([^/]+)(?:\/responses)?$/);
    return match?.[1] || null;
}

async function getPublicFormSnapshot(env, slug) {
    const response = await firestoreRequest(env, `public_forms/${slugify(slug)}`, { method: "GET" });
    if (!response.ok) {
        return null;
    }

    const data = await response.json().catch(() => null);
    if (!data) return null;
    return fromFirestoreDocument(data);
}

async function proxyGeminiGeneration({ env, body, groupHeader, model, systemInstruction = null, temperature = 0.6 }) {
    const API_GROUPS = {
        group_1: [env.GEMINI_API_KEY_1, env.GEMINI_API_KEY_2],
        group_2: [env.GEMINI_API_KEY_3, env.GEMINI_API_KEY_4],
        group_3: [env.GEMINI_API_KEY_5, env.GEMINI_API_KEY_6],
        group_4: [env.GEMINI_API_KEY_7, env.GEMINI_API_KEY_8]
    };

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

    let lastError = null;

    for (const groupName of finalGroups) {
        const keys = (API_GROUPS[groupName] || []).filter(Boolean);
        for (const key of keys) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (text) {
                    return { text, model };
                }
                lastError = { status: 500, body: "Empty response from Gemini" };
                continue;
            }

            const errorText = await response.text();
            lastError = { status: response.status, body: errorText };

            // Trigger Groq fallback for any location/quota restriction from Gemini
            const isLocationError = (
                (response.status === 400 || response.status === 403) &&
                (errorText.includes("User location is not supported") ||
                 errorText.includes("location") ||
                 errorText.includes("region") ||
                 errorText.includes("PERMISSION_DENIED"))
            );

            if (isLocationError) {
                console.warn(`[proxyGeminiGeneration] Gemini location/permission error (${response.status}). Falling back to Groq...`);
                try {
                    return await internalGroqFallback(env, body.prompt, null, systemInstruction, temperature);
                } catch (err) {
                    throw new Error("Gemini kena User Location restriction, dan Groq fallback juga gagal: " + err.message);
                }
            }

            if (!RETRYABLE_STATUS.has(response.status)) break;
        }
    }

    throw new Error(lastError?.body || "Gagal menghasilkan konten AI workspace.");
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

                // Simpan ke Firestore topups collection
                const firestoreDoc = toFirestoreDocument({
                    userId: session.uid,
                    userName: payload.customerName || session.email || "User Skripzy",
                    userEmail: session.email || payload.customerEmail || "",
                    status: "waiting_payment",
                    requestType: payload.requestType || "topup",
                    productName: payload.productName || "",
                    paymentMethodId: "automatic",
                    paymentMethodLabel: "Pembayaran Otomatis (DOKU)",
                    paymentChannelId: "doku-checkout",
                    paymentChannelLabel: "DOKU Checkout",
                    paymentChannelGroup: "gateway",
                    invoiceNumber: invoiceNumber,
                    dokuRequestId: requestId,
                    paymentUrl: paymentUrl || "",
                    promoId: payload.promoId || null,
                    promoCode: payload.promoCode || null,
                    promoType: payload.promoType || null,
                    basePrice: Math.round(payload.basePrice || payload.amount || 0),
                    discountAmount: Math.round(payload.discountAmount || 0),
                    finalPrice: Math.round(payload.amount),
                    customerNotes: "",
                    timestamp: new Date().toISOString(),
                    approvedAt: null,
                    rejectedAt: null,
                    rejectedReason: "",
                    // Plan-specific fields
                    planId: payload.planId || null,
                    planName: payload.planName || null,
                    billingPeriod: payload.billingPeriod || "monthly",
                    // Topup-specific fields
                    topupSlug: payload.topupSlug || null,
                    creditsBase: payload.creditsBase || 0,
                    bonusCredits: payload.bonusCredits || 0,
                    amount: payload.creditsTotal || 0,
                });

                const firestoreRes = await firestoreRequest(env, "topups", {
                    method: "POST",
                    body: firestoreDoc,
                });

                const fsData = await firestoreRes.json().catch(() => ({}));
                const docId = fsData?.name?.split("/").pop() || null;

                console.log(`[DOKU] Payment created: inv=${invoiceNumber}, docId=${docId}, url=${paymentUrl}`);

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
                // Find the topup doc by invoice number using Firestore REST query
                const { projectId, webApiKey } = getFirebaseConfig(env);
                const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${webApiKey}`;

                const queryBody = {
                    structuredQuery: {
                        from: [{ collectionId: "topups" }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: "invoiceNumber" },
                                op: "EQUAL",
                                value: { stringValue: invoiceNumber },
                            },
                        },
                        limit: 1,
                    },
                };

                const queryRes = await fetch(queryUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(queryBody),
                });

                const queryResults = await queryRes.json().catch(() => []);
                const matchDoc = queryResults?.[0]?.document;

                if (!matchDoc) {
                    console.warn(`[DOKU] No topup doc found for invoice: ${invoiceNumber}`);
                    return new Response(JSON.stringify({ ok: true, message: "Doc not found" }), {
                        status: 200,
                        headers: createCorsHeaders(),
                    });
                }

                const docName = matchDoc.name;
                const docData = fromFirestoreDocument(matchDoc);
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
                    // Update topup doc to approved
                    const updatePayload = toFirestoreDocument({
                        status: "approved",
                        approvedAt: now,
                        dokuTransactionStatus: transactionStatus,
                        dokuRawNotification: JSON.stringify(notifData),
                    });

                    await fetch(`https://firestore.googleapis.com/v1/${docName}?key=${webApiKey}&updateMask.fieldPaths=status&updateMask.fieldPaths=approvedAt&updateMask.fieldPaths=dokuTransactionStatus&updateMask.fieldPaths=dokuRawNotification`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updatePayload),
                    });

                    // Auto-approve: add credits or upgrade plan
                    const userId = docData.userId;
                    if (userId && env.DB) {
                        try {
                            const stmt = env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(userId);
                            const { results } = await stmt.all();
                            const userData = results[0];

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

                            // Handle promo usage
                            if (docData.promoId) {
                                const promoUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/promos/${docData.promoId}?key=${webApiKey}`;
                                const promoRes = await fetch(promoUrl);
                                if (promoRes.ok) {
                                    const promoData = fromFirestoreDocument(await promoRes.json());
                                    const promoUpdate = toFirestoreDocument({
                                        usedCount: (Number(promoData.usedCount) || 0) + 1,
                                        updatedAt: now,
                                    });
                                    await fetch(`${promoUrl}&updateMask.fieldPaths=usedCount&updateMask.fieldPaths=updatedAt`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(promoUpdate),
                                    });
                                }
                            }
                        }
                        } catch (e) {
                            console.error("[DOKU] Failed to update user in D1:", e.message);
                        }
                    }

                    console.log(`[DOKU] Payment SUCCESS processed for invoice: ${invoiceNumber}`);
                } else {
                    // Payment failed/expired
                    const failUpdate = toFirestoreDocument({
                        status: "rejected",
                        rejectedAt: now,
                        rejectedReason: `Pembayaran DOKU: ${transactionStatus}`,
                        dokuTransactionStatus: transactionStatus,
                        dokuRawNotification: JSON.stringify(notifData),
                    });

                    await fetch(`https://firestore.googleapis.com/v1/${docName}?key=${webApiKey}&updateMask.fieldPaths=status&updateMask.fieldPaths=rejectedAt&updateMask.fieldPaths=rejectedReason&updateMask.fieldPaths=dokuTransactionStatus&updateMask.fieldPaths=dokuRawNotification`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(failUpdate),
                    });

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
                const publicForm = await getPublicFormSnapshot(env, slug);
                if (!publicForm || publicForm.status !== "published") {
                    return new Response(JSON.stringify({ error: "Form publik tidak ditemukan." }), {
                        status: 404,
                        headers: createCorsHeaders(),
                    });
                }

                return new Response(JSON.stringify({ form: publicForm }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            if (request.method === "POST" && url.pathname.endsWith("/responses")) {
                const publicForm = await getPublicFormSnapshot(env, slug);
                if (!publicForm || publicForm.status !== "published") {
                    return new Response(JSON.stringify({ error: "Form publik tidak aktif." }), {
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

                const responseBody = {
                    fields: toFirestoreDocument({
                        workspaceId: publicForm.workspaceId,
                        formId: publicForm.formId,
                        publicSlug: publicForm.publicSlug,
                        submittedFrom: "public-form",
                        submittedAt: new Date().toISOString(),
                        answers: payload.answers,
                        answersLabeled: payload.answersLabeled || {},
                        metadata: {
                            userAgent: request.headers.get("User-Agent") || "",
                            locale: payload.locale || "",
                        },
                    }).fields,
                };

                const firestoreResponse = await firestoreRequest(
                    env,
                    `workspaces/${publicForm.workspaceId}/forms/${publicForm.formId}/responses`,
                    {
                        method: "POST",
                        body: responseBody,
                    }
                );

                const firestoreData = await firestoreResponse.json().catch(() => ({}));
                if (!firestoreResponse.ok) {
                    return new Response(JSON.stringify({ error: firestoreData.error?.message || "Gagal menyimpan respons publik." }), {
                        status: firestoreResponse.status,
                        headers: createCorsHeaders(),
                    });
                }

                return new Response(JSON.stringify({
                    ok: true,
                    responseId: firestoreData?.name?.split("/").pop() || null,
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
                const deleteResponse = await firestoreRequest(env, `public_forms/${slug}`, {
                    method: "DELETE",
                    authToken,
                });

                if (!deleteResponse.ok && deleteResponse.status !== 404) {
                    const errorData = await deleteResponse.json().catch(() => ({}));
                    return new Response(JSON.stringify({ error: errorData.error?.message || "Gagal menghapus snapshot form publik." }), {
                        status: deleteResponse.status,
                        headers: createCorsHeaders(),
                    });
                }

                return new Response(JSON.stringify({ ok: true, mode: "unpublish", slug }), {
                    status: 200,
                    headers: createCorsHeaders(),
                });
            }

            const snapshot = {
                ...(payload?.snapshot || {}),
                ownerId: session.uid,
                publicSlug: slug,
                status: "published",
                updatedAt: new Date().toISOString(),
                publishedAt: payload?.snapshot?.publishedAt || new Date().toISOString(),
            };

            const publishResponse = await firestoreRequest(env, `public_forms/${slug}`, {
                method: "PATCH",
                authToken,
                body: toFirestoreDocument(snapshot),
            });

            const publishData = await publishResponse.json().catch(() => ({}));
            if (!publishResponse.ok) {
                return new Response(JSON.stringify({ error: publishData.error?.message || "Gagal mempublikasikan snapshot form." }), {
                    status: publishResponse.status,
                    headers: createCorsHeaders(),
                });
            }

            return new Response(JSON.stringify({
                ok: true,
                mode: "publish",
                slug,
                documentId: publishData?.name?.split("/").pop() || slug,
            }), {
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
                "workspace_references", "workspace_forms", "workspace_transcripts",
                "workspace_analysis", "workspace_notes"
            ];

            if (!allowedTables.includes(table)) {
                return new Response(JSON.stringify({ error: "Table not allowed" }), { status: 403, headers: createCorsHeaders() });
            }

            const authToken = extractBearerToken(request);
            const session = await verifyFirebaseToken(authToken, env);
            if (!session) {
                return new Response(JSON.stringify({ error: "Unauthorized: Invalid Firebase token" }), { status: 401, headers: createCorsHeaders() });
            }

            if (!env.DB) {
                return new Response(JSON.stringify({ error: "D1 Database not bound" }), { status: 500, headers: createCorsHeaders() });
            }

            const uidColumn = table === "users" ? "id" : "user_id";

            try {
                if (request.method === "GET") {
                    const id = url.searchParams.get("id");
                    if (id) {
                        const stmt = env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND ${uidColumn} = ?`).bind(id, session.uid);
                        const { results } = await stmt.all();
                        return new Response(JSON.stringify({ data: results[0] || null }), { headers: createCorsHeaders() });
                    } else {
                        const stmt = env.DB.prepare(`SELECT * FROM ${table} WHERE ${uidColumn} = ?`).bind(session.uid);
                        const { results } = await stmt.all();
                        return new Response(JSON.stringify({ data: results }), { headers: createCorsHeaders() });
                    }
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    
                    if (table === "users") {
                        body.id = session.uid;
                    } else {
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
                    delete body.id;

                    const keys = Object.keys(body);
                    if (keys.length === 0) return new Response(JSON.stringify({ success: true }), { headers: createCorsHeaders() });

                    const hasUpdatedAt = table === "users" || table === "workspaces";
                    const setClause = keys.map(k => `${k} = ?`).join(", ") + (hasUpdatedAt ? ", updated_at = CURRENT_TIMESTAMP" : "");
                    const values = keys.map(k => body[k]);

                    const stmt = env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ? AND ${uidColumn} = ?`)
                        .bind(...values, id, session.uid);
                    
                    const result = await stmt.run();
                    return new Response(JSON.stringify({ success: true, result }), { headers: createCorsHeaders() });
                }

                if (request.method === "DELETE") {
                    const id = url.searchParams.get("id");
                    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: createCorsHeaders() });
                    const stmt = env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND ${uidColumn} = ?`).bind(id, session.uid);
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
                const timestamp = Math.round((new Date).getTime() / 1000);

                // Kita mengurutkan parameter sesuai standar Cloudinary, tambahkan folder "Referensi"
                const paramsToSign = {
                    folder: "Referensi",
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

                let lastError = null;
                for (const group of groupsToTry) {
                    const keys = (API_GROUPS[group] || []).filter(Boolean);
                    for (const key of keys) {
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${key}`, {
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
                    const matches = await env.VECTOR_INDEX.query(vector, options);
                    return new Response(JSON.stringify({ matches }), {
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
                if (upgradeHeader !== "websocket") {
                    return new Response("Expected Upgrade: websocket", { status: 426 });
                }

                const groupRequested = url.searchParams.get("group") || "group_4";
                const targetKeys = API_GROUPS[groupRequested] || API_GROUPS["group_4"];
                const usableKeys = targetKeys.filter(Boolean);

                if (usableKeys.length === 0) {
                    return new Response("Grup API tidak memiliki key yang valid.", { status: 500 });
                }

                // Ambil key pertama yang tersedia untuk sesi telepon ini
                const apiKey = usableKeys[0];

                // Cloudflare Worker akan otomatis mengupgrade `https://` menjadi WSS secara passthrough
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
            let lastError = null;

            for (const requestedGroup of groupsToTry) {
                const targetKeys = API_GROUPS[requestedGroup] || [];
                const usableKeys = targetKeys.filter(Boolean);
                if (usableKeys.length === 0) continue;

                for (let i = 0; i < usableKeys.length; i++) {
                    const currentKey = usableKeys[i];
                    let destinationURL = `https://generativelanguage.googleapis.com${url.pathname}?key=${currentKey}`;
                    if (isStream) destinationURL += "&alt=sse";

                    const apiResponse = await fetch(destinationURL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: payload,
                    });

                    if (apiResponse.ok) {
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
                    console.error(`Rotasi [${requestedGroup}]: API Key ke-${i + 1} gagal. Status: ${apiResponse.status}`);

                    // ──── FALLBACK GROQ JIKA KENA LIMIT LOKASI ────
                    const isLocationOrPermissionError = (
                        (apiResponse.status === 400 || apiResponse.status === 403) &&
                        (errorText.includes("User location is not supported") ||
                         errorText.includes("location") ||
                         errorText.includes("region") ||
                         errorText.includes("PERMISSION_DENIED"))
                    );

                    if (isLocationOrPermissionError) {
                        console.warn(`[REST Proxy] Gemini location/permission error (${apiResponse.status}). Falling back to Groq...`);
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
                    }

                    if (!RETRYABLE_STATUS.has(apiResponse.status)) {
                        const errorHeaders = createCorsHeaders();
                        errorHeaders["Access-Control-Expose-Headers"] = "x-cf-edge-info";
                        errorHeaders["x-cf-edge-info"] = `${clientColo}-${clientCountry}`;
                        
                        return new Response(errorText, {
                            status: apiResponse.status,
                            headers: errorHeaders,
                        });
                    }
                }
            }

            const errorHeaders = createCorsHeaders();
            errorHeaders["Access-Control-Expose-Headers"] = "x-cf-edge-info";
            errorHeaders["x-cf-edge-info"] = `${clientColo}-${clientCountry}`;

            return new Response(JSON.stringify({
                error: `Sistem sedang padat atau kena limit sementara. Silakan coba sesaat lagi.`,
                retryable: true,
                upstreamStatus: lastError?.status ?? 503,
                details: lastError?.body ?? null,
            }), {
                status: 503,
                headers: errorHeaders,
            });

        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: createCorsHeaders(),
            });
        }
    },
};

export default worker;
