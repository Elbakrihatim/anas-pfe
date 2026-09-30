/**
 * Thin wrapper around fetch() to talk to the Flask API.
 */

const API_BASE = "http://localhost:5000/api/travelers";

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.detail || body.title || res.statusText;
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchTravelers() {
  const res = await fetch(API_BASE);
  return handleResponse(res);
}

export async function fetchTraveler(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  return handleResponse(res);
}

export async function createTraveler(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateTraveler(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteTraveler(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  return handleResponse(res);
}

/* ── Logs ─────────────────────────────────────────────────────────── */
const LOGS_URL = "http://localhost:5000/api/logs";

export async function fetchLogs({ lines = 200, level = "" } = {}) {
  const params = new URLSearchParams();
  if (lines) params.set("lines", lines);
  if (level) params.set("level", level);
  const res = await fetch(`${LOGS_URL}?${params}`);
  return handleResponse(res);
}

export const LOGS_DOWNLOAD_URL = "http://localhost:5000/api/logs/download";

/* ── Passport MRZ & Profile Photo Extraction ───────────────────────── */
export async function extractPassportData(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("http://localhost:5000/api/passport/extract", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to extract passport details.");
  }
  return res.json();
}

