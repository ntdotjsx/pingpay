// lib/auth.ts

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";
const USER_CACHE_KEY = "auth_user";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  line_id?: string | null;
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null; // SSR guard
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: AuthUser | null): void {
  if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_CACHE_KEY);
}

export async function getUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      setCachedUser(null);
      return null;
    }
    const user = (await res.json()) as AuthUser;
    setCachedUser(user);
    return user;
  } catch {
    return getCachedUser();
  }
}

export async function loginWithLine(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/line`, { credentials: "include" });
  const data = await res.json();
  window.location.href = data.url;
}

export async function logout(): Promise<void> {
  setCachedUser(null);
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  window.location.href = "/auth";
}