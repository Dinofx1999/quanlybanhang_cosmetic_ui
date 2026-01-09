// src/services/apiWrite.ts
import axios from "axios";

const writeBaseURL = process.env.REACT_APP_API_URL || "http://localhost:3000/api"; // nếu muốn đưa vào env cũng được

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const apiWrite = axios.create({
  baseURL: writeBaseURL,
  timeout: 30000,
});

apiWrite.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiWrite;
