import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

function decodeToken(token) {
    try {
        const payload = token.split(".")[1];
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            setLoading(false);
            return;
        }

        const decoded = decodeToken(storedToken);
        if (decoded?.userId && decoded?.tenantId) {
            setToken(storedToken);
            setUser({
                userId: decoded.userId,
                tenantId: decoded.tenantId,
                role: decoded.role || "member",
                email: decoded.email || localStorage.getItem("email") || "unknown"
            });
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("email");
        }

        setLoading(false);
    }, []);

    async function persistAuth(response) {
        const nextToken = response.token;
        const nextUser = response.user || decodeToken(nextToken);

        localStorage.setItem("token", nextToken);
        if (nextUser?.email) {
            localStorage.setItem("email", nextUser.email);
        }

        setToken(nextToken);
        setUser({
            userId: nextUser?.userId,
            tenantId: nextUser?.tenantId,
            role: nextUser?.role || "member",
            email: nextUser?.email || decodeToken(nextToken)?.email || localStorage.getItem("email") || "unknown"
        });
    }

    async function login(email, password) {
        const response = await api.post("/api/auth/login", { email, password });
        await persistAuth(response.data);
        return response.data;
    }

    async function register(email, password) {
        const response = await api.post("/api/auth/register", { email, password });
        await persistAuth(response.data);
        return response.data;
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        setToken("");
        setUser(null);
        window.location.href = "/login";
    }

    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: Boolean(token && user),
        loading,
        login,
        register,
        logout
    }), [loading, token, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
