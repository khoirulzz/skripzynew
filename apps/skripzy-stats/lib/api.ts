const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";

// Fungsi pembantu untuk mengambil nilai cookie berdasarkan nama
export function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

export function getUserIdFromToken(token: string | null) {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.user_id || decoded.uid;
    } catch(e) { return null; }
}

export async function deductCredits(amount: number) {
  const token = getCookie("skripzy_token");
  const userId = getUserIdFromToken(token);
  if (!userId) throw new Error("Gagal mengambil profil pengguna.");

  const userResp = await d1Request("users", { id: userId });
  const userData = userResp.data;
  if (!userData) throw new Error("Akun tidak ditemukan.");

  const current = userData.credits ?? 0;
  if (current < amount) throw new Error(`Kredit tidak cukup. Dibutuhkan ${amount}, tersisa ${current}.`);

  await d1Request("users", {
    method: "PATCH",
    id: userId,
    body: { credits: current - amount }
  });
}


export async function d1Request(table: string, options: any = {}) {
    const { method = "GET", id = null, body = null } = options;
    const token = getCookie("skripzy_token");
    
    if (!token) throw new Error("Authentication required: Token not found");

    let url = `${WORKER_URL}/api/d1/${table}`;
    if (id) {
        url += `?id=${encodeURIComponent(id)}`;
    }

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP error ${res.status}`);
    }

    return res.json();
}

export async function generateStatsInterpretationWithAI(prompt: string, systemInstruction?: string) {
    const token = getCookie("skripzy_token");
    if (!token) throw new Error("Silakan login terlebih dahulu.");

    // Gunakan endpoint yang sama dengan workspace AI, tetapi dengan model groq/
    let url = `${WORKER_URL}/workspace/ai/chapter-generate`;

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const payload = {
        prompt,
        systemInstruction,
        model: "groq/llama-3.3-70b-versatile",
        temperature: 0.2
    };

    const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP error ${res.status}`);
    }

    return res.json();
}

export async function publishPublicFormSnapshot(snapshot: any, slug: string, mode: "publish" | "unpublish" = "publish") {
    const token = getCookie("skripzy_token");
    if (!token) throw new Error("Silakan login terlebih dahulu.");

    const res = await fetch(`${WORKER_URL}/workspace/forms/publish`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ snapshot, slug, mode })
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP error ${res.status}`);
    }

    return res.json();
}

export async function fetchPublicFormBySlug(slug: string) {
    const res = await fetch(`${WORKER_URL}/public/forms/${encodeURIComponent(slug)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP error ${res.status}`);
    }

    return res.json();
}

export async function submitPublicFormResponse(slug: string, payload: any) {
    const res = await fetch(`${WORKER_URL}/public/forms/${encodeURIComponent(slug)}/responses`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP error ${res.status}`);
    }

    return res.json();
}
