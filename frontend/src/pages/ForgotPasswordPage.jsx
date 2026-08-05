import { useState } from "react";
import { Link } from "wouter";

import { requestPasswordReset } from "../api/auth";
import AuthFrame from "../components/AuthFrame";

function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const result = await requestPasswordReset(email);
            setMessage(result.message);
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not request a password reset.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthFrame
            eyebrow="Account recovery"
            title="Reset your password"
            description="Enter your account email and we will send a short-lived reset link."
        >
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
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                    <span className="mb-2 block text-xs font-medium text-secondary">Email address</span>
                    <input
                        className="field h-11"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                    />
                </label>
                <button className="button-primary w-full" type="submit" disabled={busy}>
                    {busy ? "Sending..." : "Send reset link"}
                </button>
            </form>
            <Link to="/login" className="button-secondary mt-4 w-full">
                Return to sign in
            </Link>
        </AuthFrame>
    );
}

export default ForgotPasswordPage;
