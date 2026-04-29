import { auth } from "@/lib/firebase";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sesi login tidak tersedia.");
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Permintaan ke layanan workspace gagal.");
  }
  return data;
}

export async function publishPublicFormSnapshot(payload) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${WORKER_URL}/workspace/forms/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function unpublishPublicFormSnapshot(payload) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${WORKER_URL}/workspace/forms/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ ...payload, mode: "unpublish" }),
  });

  return parseResponse(response);
}

export async function fetchPublicFormBySlug(slug) {
  const response = await fetch(`${WORKER_URL}/public/forms/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return parseResponse(response);
}

export async function submitPublicFormResponse(slug, payload) {
  const response = await fetch(`${WORKER_URL}/public/forms/${encodeURIComponent(slug)}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function generateWorkspaceChapter(payload) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${WORKER_URL}/workspace/ai/chapter-generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}
