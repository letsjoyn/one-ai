import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");

        try {
            await login(email, password);
            const destination = location.state?.from?.pathname || "/dashboard";
            navigate(destination, { replace: true });
        } catch (err) {
            setError(err?.response?.data?.error || "Invalid credentials");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
            <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
                <div className="panel w-full border-white/10 bg-slate-950/70 p-8 text-white shadow-2xl">
                    <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
                    <p className="mt-2 text-sm text-slate-300">Sign in to access your documents and chats.</p>

                    {error && (
                        <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                        <label className="block space-y-2 text-sm">
                            <span className="text-slate-300">Email</span>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-teal-400"
                                placeholder="you@company.com"
                            />
                        </label>

                        <label className="block space-y-2 text-sm">
                            <span className="text-slate-300">Password</span>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-teal-400"
                                placeholder="••••••••"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-400 disabled:opacity-60"
                        >
                            {busy ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="mt-6 text-sm text-slate-300">
                        No account? <Link to="/register" className="font-semibold text-teal-300">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
