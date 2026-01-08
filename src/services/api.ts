// src/services/api.ts
import axios from "axios";
import { getCurrentUser, getToken } from "./authService"; // ✅ đảm bảo có hàm getToken()
import { getActiveBranchId } from "./branchContext";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  timeout: 20000,
});

// ✅ Request interceptor: attach token + branchId
api.interceptors.request.use(
  (config) => {
    // 1) Token
    const token = getToken?.() || localStorage.getItem("token"); // fallback
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2) BranchId (cho GET)
    const user = getCurrentUser?.();
    if (user && config.method?.toLowerCase() === "get") {
      const branchId = getActiveBranchId(user); // STAFF => id, ADMIN/MANAGER => all|id
      config.params = { ...(config.params || {}), branchId };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor: optional debug
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Nếu muốn debug 401:
    // console.log("API ERROR:", err?.response?.status, err?.response?.data);
    return Promise.reject(err);
  }
);

export default api;
