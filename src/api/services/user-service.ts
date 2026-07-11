import client from "../client";

export interface LoginRequest {
  name: string;
  password: string;
}

export type LoginResponse = {
  success: boolean;
  error?: number; // 1000 = wrong credentials
  user?: string;
  name?: string;
  authentication_token?: string;
  refresh_token?: string;
};

export interface RefreshRequest {
  refresh_token: string;
}

export type RefreshResponse = {
  success: boolean;
  authentication_token?: string;
  refresh_token?: string;
};

export type SuccessResponse = { success: boolean; error?: number };

export const UserApi = {
  Login: "/signin/",
  Refresh: "/refresh/",
  Logout: "/logout/",
  ChangeName: "/name/change/",
  ChangePassword: "/user/password/change/",
} as const;

const login = (data: LoginRequest) =>
  client.post<LoginResponse>({ url: UserApi.Login, data });

const refresh = (data: RefreshRequest) =>
  client.post<RefreshResponse>({ url: UserApi.Refresh, data });

const logout = () => client.get({ url: UserApi.Logout });

const changeName = (name: string) =>
  client.post<SuccessResponse>({ url: UserApi.ChangeName, data: { name } });

const changePassword = (password: string, new_password: string) =>
  client.post<SuccessResponse>({
    url: UserApi.ChangePassword,
    data: { password, new_password },
  });

export default { login, refresh, logout, changeName, changePassword };
