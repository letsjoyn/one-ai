import { Link } from "wouter";

import ThemeToggle from "./ThemeToggle";

function AuthFrame({ eyebrow, title, description, children }) {
    return (
        <div className="min-h-screen bg-canvas text-primary">
            <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-5 md:px-8">
                <Link to="/login" className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center bg-primary text-sm font-bold text-surface">OQ</span>
                    <span className="text-sm font-semibold">OmniQuery</span>
                </Link>
                <ThemeToggle />
            </header>
            <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center px-5 py-12">
                <section className="w-full border border-line bg-surface p-6 sm:p-8">
                    <p className="eyebrow">{eyebrow}</p>
                    <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
                    <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
                    {children}
                </section>
            </main>
        </div>
    );
}

export default AuthFrame;
