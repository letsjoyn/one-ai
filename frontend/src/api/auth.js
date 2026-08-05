import { api } from "./client";

export async function loginRequest(email, password) {
    const response = await api.post("/api/auth/login", { email, password });
    return response.data;
}

export async function registerRequest(email, password) {
    const response = await api.post("/api/auth/register", { email, password });
    return response.data;
}

export async function verifyEmail(token) {
    const response = await api.post("/api/auth/verify-email", { token });
    return response.data;
}

export async function resendVerification(email) {
    const response = await api.post("/api/auth/resend-verification", { email });
    return response.data;
}

export async function requestPasswordReset(email) {
    const response = await api.post("/api/auth/forgot-password", { email });
    return response.data;
}

export async function resetPassword(token, password) {
    const response = await api.post("/api/auth/reset-password", { token, password });
    return response.data;
}

export async function fetchCurrentUser() {
    const response = await api.get("/api/auth/me");
    return response.data.user;
}
