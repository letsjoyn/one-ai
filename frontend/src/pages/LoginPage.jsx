import { ArrowRight, FileSearch, LockKeyhole, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
    const { login } = useAuth();
    const [, navigate] = useLocation();
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
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err?.response?.data?.error || "Invalid credentials. Check your email and password.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-canvas text-primary">
            <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-5 md:px-8">
                <Link to="/login" className="flex items-center gap-2.5 group">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-[rgb(var(--text-primary))] text-[10px] font-bold tracking-wide text-[rgb(var(--surface))]">
                        OQ
                    </span>
                    <span className="text-[13px] font-semibold tracking-tight">OmniQuery</span>
                </Link>
                <ThemeToggle />
            </header>

            <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl items-stretch lg:grid-cols-2">
                {/* Left panel */}
                <section className="hidden border-r border-line px-14 py-16 lg:flex lg:flex-col lg:justify-between">
                    <div>
                        <p className="eyebrow mb-5">Document intelligence</p>
                        <h1 className="max-w-md text-[2.25rem] font-semibold leading-[1.2] tracking-tight">
                            Private knowledge search.<br />
                            <span className="text-secondary font-normal">Grounded in your sources.</span>
                        </h1>
                        <p className="mt-6 max-w-sm text-[13px] leading-6 text-secondary">
                            Upload PDFs and internal documents, then ask focused questions. Every answer cites the exact source passages it used.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {[
                            { icon: FileSearch, title: "Source-backed answers", desc: "Inspect every passage used to generate a response." },
                            { icon: LockKeyhole, title: "Private workspace", desc: "Your files never leave your own storage bucket." },
                            { icon: Zap, title: "Async indexing", desc: "Upload and walk away — processing runs in the background." }
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="flex items-start gap-4 rounded-lg border border-line bg-surface p-4">
                                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded border border-line bg-subtle text-secondary">
                                    <Icon size={15} />
                                </span>
                                <div>
                                    <p className="text-[13px] font-semibold">{title}</p>
                                    <p className="mt-0.5 text-[12px] text-secondary">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Right panel — form */}
                <section className="flex items-center px-6 py-14 sm:px-12 lg:px-14">
                    <div className="w-full max-w-sm">
                        <p className="eyebrow mb-4">Account access</p>
                        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                        <p className="mt-1.5 text-[13px] text-secondary">
                            Continue to your OmniQuery workspace.
                        </p>

                        {error && (
                            <div className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                            <label className="block">
                                <span className="mb-1.5 block text-[12px] font-medium text-secondary">Email address</span>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="field"
                                    placeholder="you@company.com"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-secondary">
                                    Password
                                    <Link to="/forgot-password" className="text-accent hover:underline">
                                        Forgot password?
                                    </Link>
                                </span>
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="field"
                                    placeholder="Enter your password"
                                />
                            </label>

                            <button type="submit" disabled={busy} className="button-primary w-full mt-1">
                                {busy ? "Signing in…" : "Sign in"}
                                {!busy && <ArrowRight size={15} />}
                            </button>
                        </form>

                        <p className="mt-6 text-[13px] text-secondary">
                            New to OmniQuery?{" "}
                            <Link to="/register" className="font-semibold text-accent hover:underline">
                                Create an account
                            </Link>
                        </p>

                        {error?.toLowerCase().includes("verify") && (
                            <Link
                                to={`/verify-email?email=${encodeURIComponent(email)}`}
                                className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline"
                            >
                                Send a new verification link →
                            </Link>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default LoginPage;
