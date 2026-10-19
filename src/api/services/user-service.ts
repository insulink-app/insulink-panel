import client from "../client";

export interface LoginRequest {
  name: string;
  password: string;
}

export type LoginResponse = {
  success: boolean;
  error?: { code?: number }; // 1000 = wrong credentials, 1003 = too many attempts
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

export type SuccessResponse = { success: boolean; error?: { code?: number } };

export type KeyResponse = { success: boolean; key?: string };

export const UserApi = {
  Login: "/signin/",
  Refresh: "/refresh/",
  Logout: "/logout/",
  ChangeName: "/user/name/change/",
  ChangePassword: "/user/password/change/",
  FindKey: "/user/key/find/",
  Delete: "/user/delete/",
} as const;

const login = (data: LoginRequest) =>
  client.post<LoginResponse>({ url: UserApi.Login, data });

const refresh = (data: RefreshRequest) =>
  client.post<RefreshResponse>({ url: UserApi.Refresh, data });

const logout = () => client.get({ url: UserApi.Logout });

const changeName = (name: string) =>
  client.post<SuccessResponse>({ url: UserApi.ChangeName, data: { name } });

/** `key` is the account's data key wrapped for the new password (`@/lib/data-key`). */
const changePassword = (password: string, new_password: string, key?: string) =>
  client.post<SuccessResponse>({
    url: UserApi.ChangePassword,
    data: key ? { password, new_password, key } : { password, new_password },
  });

/** The wrapped data key; the api answers 1000 when the account has none. */
const findKey = () => client.get<KeyResponse>({ url: UserApi.FindKey });

const deleteAccount = (password: string) =>
  client.post<SuccessResponse>({ url: UserApi.Delete, data: { password } });

export default {
  login,
  refresh,
  logout,
  changeName,
  changePassword,
  findKey,
  deleteAccount,
};
