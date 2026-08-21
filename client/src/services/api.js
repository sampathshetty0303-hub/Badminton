import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000/api"; // ← Change this line

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "ACCOUNT_PENDING_APPROVAL"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/pending-approval";
    }

    return Promise.reject(error);
  }
);

export default api;