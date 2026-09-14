import { useState } from "react";
import { Link } from "wouter";

import { resetPassword } from "../api/auth";
import AuthFrame from "../components/AuthFrame";

function ResetPasswordPage() {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setBusy(true);
        setError("");
        try {
            const result = await resetPassword(token, password);
            setMessage(result.message);
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not reset the password.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthFrame
            eyebrow="Account recovery"
            title="Choose a new password"
            description="Use at least twelve characters and keep this password unique to OmniQuery."
        >
            {!token && (
                <div className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    This reset link is missing its token.
                </div>
            )}
            {message && (
                <div className="mt-6 border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {message}
                </div>
            )}
            {error && (
                <div className="mt-6 border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            )}
            {!message && (
                <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-secondary">New password</span>
                        <input
                            className="field h-11"
                            type="password"
                            autoComplete="new-password"
                            minLength={12}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-secondary">Confirm password</span>
                        <input
                            className="field h-11"
                            type="password"
                            autoComplete="new-password"
                            minLength={12}
                            required
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                    </label>
                    <button className="button-primary w-full" type="submit" disabled={busy || !token}>
                        {busy ? "Updating..." : "Update password"}
                    </button>
                </form>
            )}
            <Link to="/login" className="button-secondary mt-4 w-full">
                Return to sign in
            </Link>
        </AuthFrame>
    );
}

export default ResetPasswordPage;
