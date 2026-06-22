"use client";

export function saveAuth(token: string, user: { id: string; email: string; role: string }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser(): { id: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
