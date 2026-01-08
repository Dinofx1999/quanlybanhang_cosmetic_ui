// authService.ts

const TOKEN_KEY = "token";
const USER_KEY = "user";

export const login = (token: string, user: any): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem(TOKEN_KEY);
};

// ✅ THÊM HÀM NÀY
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// export const getCurrentUser = (): any => {
//   const userStr = localStorage.getItem(USER_KEY);
//   return userStr ? JSON.parse(userStr) : null;
// };
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};