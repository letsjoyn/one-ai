import { ArrowRight, FileStack, SearchCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

function RegisterPage() {
    const { register } = useAuth();
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
            const result = await register(email, password);
            if (result.requiresVerification) {
                navigate(`/verify-email?email=${encodeURIComponent(result.email)}`, { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        } catch (err) {
            setError(err?.response?.data?.error || "Registration failed");
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
                        <p className="eyebrow">Create a workspace</p>
                        <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">
                            Turn document collections into a focused research workspace.
                        </h1>
                        <p className="mt-5 max-w-lg text-base leading-7 text-secondary">
                            Build a searchable knowledge base from PDFs and get concise answers with traceable sources.
                        </p>
                    </div>
                    <div className="grid max-w-xl grid-cols-2 border border-line bg-surface">
                        <div className="border-r border-line p-5">
                            <FileStack size={20} className="text-accent" />
                            <p className="mt-4 text-sm font-semibold">Asynchronous indexing</p>
                            <p className="mt-1 text-xs leading-5 text-secondary">Continue working while larger files are processed.</p>
                        </div>
                        <div className="p-5">
                            <SearchCheck size={20} className="text-accent" />
                            <p className="mt-4 text-sm font-semibold">Context retrieval</p>
                            <p className="mt-1 text-xs leading-5 text-secondary">Find the most relevant passages before generating answers.</p>
                        </div>
                    </div>
                </section>

                <section className="flex items-center px-5 py-12 sm:px-10 lg:px-12">
                    <div className="w-full">
                        <p className="eyebrow">Get started</p>
                        <h2 className="mt-3 text-2xl font-semibold">Create account</h2>
                        <p className="mt-2 text-sm text-secondary">Set up your private document workspace.</p>

                        {error && (
                            <div className="mt-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                            <label className="block">
                                <span className="mb-2 block text-xs font-medium text-secondary">Work email</span>
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
                                <span className="mb-2 block text-xs font-medium text-secondary">Password</span>
                                <input
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={12}
                                    required
                                    className="field h-11"
                                    placeholder="At least 12 characters"
                                />
                            </label>

                            <button type="submit" disabled={busy} className="button-primary w-full">
                                {busy ? "Creating account..." : "Create account"}
                                {!busy && <ArrowRight size={16} />}
                            </button>
                        </form>

                        <p className="mt-6 text-sm text-secondary">
                            Already have an account?{" "}
                            <Link to="/login" className="font-semibold text-accent hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default RegisterPage;
