export function getApiBase(): string {
  const meta = document.querySelector('meta[name="api-base"]');
  return meta ? meta.getAttribute("content") || "" : "";
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const url = path.startsWith("/") ? `${base}${path}` : path;
  return fetch(url, init);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: Record<string, any>): Promise<any> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}
