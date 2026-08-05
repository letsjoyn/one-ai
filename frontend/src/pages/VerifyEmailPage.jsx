import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

import { resendVerification, verifyEmail } from "../api/auth";
import AuthFrame from "../components/AuthFrame";

function VerifyEmailPage() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const [email, setEmail] = useState(params.get("email") || "");
    const [status, setStatus] = useState(token ? "loading" : "waiting");
    const [message, setMessage] = useState(
        token ? "Verifying your email..." : "Open the verification link sent to your inbox."
    );
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!token) {
            return;
        }

        verifyEmail(token)
            .then((result) => {
                setStatus("success");
                setMessage(result.message);
            })
            .catch((error) => {
                setStatus("error");
                setMessage(error?.response?.data?.error || "Verification failed.");
            });
    }, [token]);

    async function handleResend(event) {
        event.preventDefault();
        setBusy(true);
        try {
            const result = await resendVerification(email);
            setStatus("success");
            setMessage(result.message);
        } catch (error) {
            setStatus("error");
            setMessage(error?.response?.data?.error || "Could not send a verification email.");
        } finally {
            setBusy(false);
        }
    }

    const StatusIcon = status === "success"
        ? CheckCircle2
        : status === "error"
            ? XCircle
            : Mail;

    return (
        <AuthFrame
            eyebrow="Account verification"
            title="Verify your email"
            description="Verification protects workspace access and enables account recovery."
        >
            <div className="mt-7 flex items-start gap-3 border border-line bg-subtle p-4">
                <StatusIcon size={18} className="mt-0.5 shrink-0 text-secondary" />
                <p className="text-sm leading-6">{message}</p>
            </div>

            {status !== "loading" && status !== "success" && (
                <form className="mt-6 space-y-4" onSubmit={handleResend}>
                    <label className="block">
                        <span className="mb-2 block text-xs font-medium text-secondary">Email address</span>
                        <input
                            className="field h-11"
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@company.com"
                        />
                    </label>
                    <button className="button-primary w-full" type="submit" disabled={busy}>
                        {busy ? "Sending..." : "Send another link"}
                    </button>
                </form>
            )}

            <Link to="/login" className="button-secondary mt-6 w-full">
                Return to sign in
            </Link>
        </AuthFrame>
    );
}

export default VerifyEmailPage;
