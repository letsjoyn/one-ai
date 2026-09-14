import { useState } from "react";
import { useLocation } from "wouter";

import AuthFrame from "../components/AuthFrame";
import { useAuth } from "../context/AuthContext";

function AcceptInvitePage() {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const { acceptInvite } = useAuth();
    const [, navigate] = useLocation();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            await acceptInvite(token, password);
            navigate("/dashboard", { replace: true });
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not accept the invitation.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthFrame
            eyebrow="Workspace invitation"
            title="Join the workspace"
            description="Enter your account password. If this email is new to OmniQuery, the password creates your account."
        >
            {!token && (
                <div className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    This invitation link is missing its token.
                </div>
            )}
            {error && (
                <div className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            )}
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                    <span className="mb-2 block text-xs font-medium text-secondary">Account password</span>
                    <input
                        className="field h-11"
                        type="password"
                        autoComplete="current-password"
                        minLength={12}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                <button className="button-primary w-full" type="submit" disabled={busy || !token}>
                    {busy ? "Joining..." : "Accept invitation"}
                </button>
            </form>
        </AuthFrame>
    );
}

export default AcceptInvitePage;
