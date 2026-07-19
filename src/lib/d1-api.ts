export const API_BASE = "https://lms-test-api.hamza818483.workers.dev";

export async function apiSignup(payload: {
  email: string; password: string; full_name?: string; phone?: string;
}) {
  const r = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: r.ok, data: await r.json() };
}

export async function apiLogin(identifier: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  return { ok: r.ok, data: await r.json() };
}
