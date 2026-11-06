const ADMIN_KEY_STORAGE = "pg_admin_secret_key";

// API base URL. Set VITE_API_URL in the admin's environment for production;
// falls back to localhost for local development.
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:4000/api";

export function getAdminKey(): string {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function setAdminKey(key: string) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey() {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export async function adminFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const adminKey = getAdminKey();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `API Error: ${res.status}`);
  }

  return res.json();
}

/** Upload one or more image files to the backend; returns their public URLs. */
export async function uploadImages(files: File[]): Promise<string[]> {
  const adminKey = getAdminKey();
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: "POST",
    headers: { "x-admin-key": adminKey },
    body: form,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Upload failed: ${res.status}`);
  }

  const data = (await res.json()) as { success: boolean; urls: string[] };
  return data.urls ?? [];
}

/** Check whether the backend has cloud image storage configured. */
export async function getUploadStatus(): Promise<boolean> {
  try {
    const res = await adminFetch<{ success: boolean; configured: boolean }>("/admin/upload/status");
    return res.configured;
  } catch {
    return false;
  }
}
