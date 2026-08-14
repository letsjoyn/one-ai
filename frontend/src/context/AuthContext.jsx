import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { acceptInvitation, acceptPendingInvitation } from "../api/team";

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
        let cancelled = false;
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            setLoading(false);
            return;
        }

        const decoded = decodeToken(storedToken);
        if (decoded?.userId && decoded?.tenantId) {
            setToken(storedToken);
            api.get("/api/auth/me")
                .then((response) => {
                    if (!cancelled) {
                        setUser(response.data.user);
                    }
                })
                .catch((error) => {
                    if (!cancelled && error?.response?.status === 401) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("email");
                        setToken("");
                        setUser(null);
                    } else if (!cancelled) {
                        setUser({
                            userId: decoded.userId,
                            tenantId: decoded.tenantId,
                            role: decoded.role || "member",
                            email: decoded.email || localStorage.getItem("email") || "unknown"
                        });
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setLoading(false);
                    }
                });
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("email");
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, []);

    function persistAuth(response) {
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
            email: nextUser?.email || decodeToken(nextToken)?.email || localStorage.getItem("email") || "unknown",
            emailVerified: Boolean(nextUser?.emailVerified)
        });
    }

    async function login(email, password) {
        const response = await api.post("/api/auth/login", { email, password });
        persistAuth(response.data);
        return response.data;
    }

    async function register(email, password) {
        const response = await api.post("/api/auth/register", { email, password });
        if (response.data.token) {
            persistAuth(response.data);
        }
        return response.data;
    }

    async function acceptInvite(tokenValue, password) {
        const response = await acceptInvitation(tokenValue, password);
        persistAuth(response);
        return response;
    }

    async function acceptWorkspaceInvitation(invitationId) {
        const response = await acceptPendingInvitation(invitationId);
        persistAuth(response);
        return response;
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
        acceptInvite,
        acceptWorkspaceInvitation,
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
