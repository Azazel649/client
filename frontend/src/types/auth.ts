export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfo {
  user_id: number;
  username: string;
  real_name: string | null;
  role: string;
  status: number;
  last_login_time: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer" | string;
  user: UserInfo;
}
