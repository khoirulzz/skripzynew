/**
 * SKRIPZY CLOUDFLARE WORKER - GEMINI LOAD BALANCER
 * Script ini menggunakan Environment Variables Cloudflare.
 * Mendukung REST API biasa dan WebSocket Proxy Pass-Through untuk Gemini Live.
 */

const RETRYABLE_STATUS = new Set([401, 403, 408, 429, 500, 502, 503, 504]);

function createCorsHeaders(extra = {}) {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-skripzy-secret, x-api-group, Authorization",
        "Access-Control-Allow-Methods": "POST, GET, PATCH, DELETE, OPTIONS",
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
            if (!RETRYABLE_STATUS.has(response.status)) break;
        }
    }

    throw new Error(lastError?.body || "Gagal menghasilkan konten AI workspace.");
}

const worker = {
    async fetch(request, env, ctx) {
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
                        content: { parts: [{ text: t }] }
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
                    let openalexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${Math.min(limit, 50)}`;

                    // Add year filtering if provided
                    if (yearFrom && yearTo) {
                        const yearFilter = `publication_year:${yearFrom}-${yearTo}`;
                        openalexUrl += `&filter=${encodeURIComponent(yearFilter)}`;
                    }

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
                                "Content-Type": apiResponse.headers.get("Content-Type") || "application/json",
                            },
                        });
                    }

                    const errorText = await apiResponse.text();
                    lastError = { status: apiResponse.status, body: errorText };
                    console.error(`Rotasi [${requestedGroup}]: API Key ke-${i + 1} gagal. Status: ${apiResponse.status}`);

                    if (!RETRYABLE_STATUS.has(apiResponse.status)) {
                        return new Response(errorText, {
                            status: apiResponse.status,
                            headers: createCorsHeaders(),
                        });
                    }
                }
            }

            return new Response(JSON.stringify({
                error: `Sistem sedang padat atau kena limit sementara. Silakan coba sesaat lagi.`,
                retryable: true,
                upstreamStatus: lastError?.status ?? 503,
                details: lastError?.body ?? null,
            }), {
                status: 503,
                headers: createCorsHeaders(),
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
