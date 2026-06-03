import { useCallback, useSyncExternalStore } from "react";

import * as authApi from "../api/authApi";
import { authStore } from "../store/authStore";
import type { LoginRequest } from "../types/auth";

export function useAuth() {
  const auth = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot);

  const login = useCallback(async (payload: LoginRequest) => {
    authStore.setLoading();
    try {
      const response = await authApi.login(payload);
      authStore.setSession(response.access_token, response.user);
      return response.user;
    } catch (error) {
      authStore.clearSession();
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authStore.getSnapshot().token) {
      return null;
    }

    authStore.setLoading();
    try {
      const user = await authApi.getCurrentUser();
      authStore.setUser(user);
      return user;
    } catch (error) {
      authStore.clearSession();
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authStore.getSnapshot().token) {
        await authApi.logout();
      }
    } finally {
      authStore.clearSession();
    }
  }, []);

  return {
    ...auth,
    isAuthenticated: Boolean(auth.token && auth.user),
    login,
    logout,
    refreshUser,
  };
}
