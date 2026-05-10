import { auth } from "./firebase";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";

export async function getAuthToken() {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
}

/**
 * Standard CRUD request for D1 Database
 */
export async function d1Request(table, options = {}) {
    const { method = "GET", id = null, body = null } = options;
    const token = await getAuthToken();
    if (!token) throw new Error("Authentication required");

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
