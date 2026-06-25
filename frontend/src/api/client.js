import axios from "axios";

export const defaultUserId = import.meta.env.VITE_DEFAULT_USER_ID || "demo-user";

export const api = axios.create({
    baseURL: import.meta.env.VITE_GATEWAY_URL || "http://localhost:8080"
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    config.headers = config.headers || {};
    config.headers["x-user-id"] = defaultUserId;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
