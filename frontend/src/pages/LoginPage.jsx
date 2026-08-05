import { ArrowRight, FileSearch, LockKeyhole } from "lucide-react";
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
            setError(err?.response?.data?.error || "Invalid credentials");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-canvas text-primary">
            <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-5 md:px-8">
                <Link to="/login" className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center bg-primary text-sm font-bold text-surface">OQ</span>
                    <span className="text-sm font-semibold">OmniQuery</span>
                </Link>
                <ThemeToggle />
            </header>

            <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-stretch lg:grid-cols-[1fr_480px]">
                <section className="hidden border-r border-line px-12 py-16 lg:flex lg:flex-col lg:justify-between">
                    <div>
                        <p className="eyebrow">Document intelligence</p>
                        <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">
                            Search your knowledge with answers grounded in source material.
                        </h1>
                        <p className="mt-5 max-w-lg text-base leading-7 text-secondary">
                            Upload private PDFs, process them asynchronously, and ask focused questions with source references.
                        </p>
                    </div>
                    <div className="grid max-w-xl grid-cols-2 border border-line bg-surface">
                        <div className="border-r border-line p-5">
                            <FileSearch size={20} className="text-accent" />
                            <p className="mt-4 text-sm font-semibold">Source-backed answers</p>
                            <p className="mt-1 text-xs leading-5 text-secondary">Inspect the document passages used for every response.</p>
                        </div>
                        <div className="p-5">
                            <LockKeyhole size={20} className="text-accent" />
                            <p className="mt-4 text-sm font-semibold">Private workspace</p>
                            <p className="mt-1 text-xs leading-5 text-secondary">Keep uploads and retrieval inside your workspace.</p>
                        </div>
                    </div>
                </section>

                <section className="flex items-center px-5 py-12 sm:px-10 lg:px-12">
                    <div className="w-full">
                        <p className="eyebrow">Account access</p>
                        <h2 className="mt-3 text-2xl font-semibold">Sign in</h2>
                        <p className="mt-2 text-sm text-secondary">Continue to your OmniQuery workspace.</p>

                        {error && (
                            <div className="mt-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                            <label className="block">
                                <span className="mb-2 block text-xs font-medium text-secondary">Email address</span>
                                <input
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="field h-11"
                                    placeholder="you@company.com"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 flex items-center justify-between text-xs font-medium text-secondary">
                                    Password
                                    <Link to="/forgot-password" className="text-accent hover:underline">
                                        Forgot password?
                                    </Link>
                                </span>
                                <input
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="field h-11"
                                    placeholder="Enter your password"
                                />
                            </label>

                            <button type="submit" disabled={busy} className="button-primary w-full">
                                {busy ? "Signing in..." : "Sign in"}
                                {!busy && <ArrowRight size={16} />}
                            </button>
                        </form>

                        <p className="mt-6 text-sm text-secondary">
                            New to OmniQuery?{" "}
                            <Link to="/register" className="font-semibold text-accent hover:underline">
                                Create an account
                            </Link>
                        </p>
                        {error && error.toLowerCase().includes("verify") && (
                            <Link
                                to={`/verify-email?email=${encodeURIComponent(email)}`}
                                className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
                            >
                                Send a new verification link
                            </Link>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default LoginPage;
