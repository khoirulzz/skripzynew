/**
 * SKRIPZY CLOUDFLARE WORKER - GEMINI LOAD BALANCER
 * Script ini menggunakan Environment Variables Cloudflare.
 * Mendukung REST API biasa dan WebSocket Proxy Pass-Through untuk Gemini Live.
 */

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function createCorsHeaders(extra = {}) {
    return {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        ...extra,
    };
}

export default {
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
                    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, x-skripzy-secret, x-api-group",
                    "Access-Control-Max-Age": "86400",
                },
            });
        }

        // 2. Keamanan Sederhana: Memakai Custom Secret
        const EXPECTED_SECRET = env.WORKER_SECRET || "skripzy1234";
        const url = new URL(request.url);
        
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