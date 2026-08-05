import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_GATEWAY_URL || "http://localhost:8080"
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    config.headers = config.headers || {};
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401
            && localStorage.getItem("token")
            && !error.config?.skipAuthRedirect
        ) {
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            window.location.assign("/login");
        }
        return Promise.reject(error);
    }
);
