// src/services/api.ts
import axios from "axios";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:9009/api";

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
