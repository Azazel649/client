import { clearToken, getToken, saveToken } from "../api/request";
import type { UserInfo } from "../types/auth";

type AuthStatus = "anonymous" | "loading" | "authenticated";

export interface AuthSnapshot {
  token: string | null;
  user: UserInfo | null;
  status: AuthStatus;
}

const USER_KEY = "intelligent_mes_user";

function readUser() {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    window.localStorage.removeItem(USER_KEY);
    return null;
  }
}

let snapshot: AuthSnapshot = {
  token: getToken(),
  user: readUser(),
  status: getToken() ? "loading" : "anonymous",
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: AuthSnapshot) {
  snapshot = next;
  emit();
}

export const authStore = {
  getSnapshot() {
    return snapshot;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setLoading() {
    setSnapshot({ ...snapshot, status: "loading" });
  },

  setSession(token: string, user: UserInfo) {
    saveToken(token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    setSnapshot({ token, user, status: "authenticated" });
  },

  setUser(user: UserInfo) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    setSnapshot({ ...snapshot, user, status: "authenticated" });
  },

  clearSession() {
    clearToken();
    window.localStorage.removeItem(USER_KEY);
    setSnapshot({ token: null, user: null, status: "anonymous" });
  },
};
