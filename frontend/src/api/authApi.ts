import { request } from "./request";
import type { LoginRequest, LoginResponse, UserInfo } from "../types/auth";

export function login(payload: LoginRequest) {
  return request.post<LoginResponse, LoginResponse>("/auth/login", payload);
}

export function getCurrentUser() {
  return request.get<UserInfo, UserInfo>("/auth/me");
}

export function logout() {
  return request.post<{ message: string }, { message: string }>("/auth/logout");
}
