import {
    Database,
    LogOut,
    Menu,
    MessageSquare,
    Settings,
    X
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/dashboard", label: "Documents", icon: Database },
    { to: "/chat", label: "Chat", icon: MessageSquare },
    { to: "/settings", label: "Settings", icon: Settings }
];

function initials(email = "") {
    return email.slice(0, 2).toUpperCase();
}

function AppShell({ children }) {
    const { user, logout } = useAuth();
    const [location] = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    function closeMobileNav() { setMobileOpen(false); }

    return (
        <div className="min-h-screen bg-canvas text-primary">
            {/* Mobile overlay */}
            {mobileOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={closeMobileNav}
                    aria-label="Close navigation"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-line bg-surface transition-transform duration-200 ease-out md:translate-x-0 ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Logo */}
                <div className="flex h-14 items-center justify-between border-b border-line px-4">
                    <Link to="/dashboard" onClick={closeMobileNav} className="flex items-center gap-2.5 group">
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-[rgb(var(--text-primary))] text-[10px] font-bold tracking-wide text-[rgb(var(--surface))] group-hover:opacity-80 transition-opacity">
                            OQ
                        </span>
                        <span className="text-sm font-semibold tracking-tight">OmniQuery</span>
                    </Link>
                    <button
                        type="button"
                        className="icon-button border-0 md:hidden"
                        onClick={closeMobileNav}
                        aria-label="Close navigation"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-2 py-4">
                    <p className="eyebrow px-3 pb-3">Workspace</p>
                    <div className="space-y-0.5">
                        {navItems.map(({ to, label, icon: Icon }) => {
                            const active = location === to || location.startsWith(to + "/");
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    onClick={closeMobileNav}
                                    className={`flex h-9 items-center gap-2.5 rounded px-3 text-[13px] font-medium transition-colors ${
                                        active
                                            ? "bg-subtle text-primary"
                                            : "text-secondary hover:bg-subtle hover:text-primary"
                                    }`}
                                >
                                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                                    {label}
                                    {active && (
                                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User footer */}
                <div className="border-t border-line p-2">
                    <div className="flex items-center gap-2.5 rounded px-3 py-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-subtle text-[11px] font-semibold text-secondary">
                            {initials(user?.email)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium leading-tight">{user?.email}</p>
                            <p className="text-[11px] capitalize text-secondary">{user?.role || "member"}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={logout}
                        className="flex h-8 w-full items-center gap-2.5 rounded px-3 text-[12px] text-secondary transition-colors hover:bg-subtle hover:text-primary"
                    >
                        <LogOut size={13} />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="md:pl-56">
                {/* Top bar */}
                <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur-md md:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            className="icon-button border-0 md:hidden"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation"
                        >
                            <Menu size={16} />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            {navItems.find(n => location.startsWith(n.to)) && (() => {
                                const item = navItems.find(n => location.startsWith(n.to));
                                const Icon = item.icon;
                                return (
                                    <>
                                        <Icon size={14} className="text-secondary shrink-0" />
                                        <p className="text-[13px] font-semibold truncate">{item.label}</p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    <ThemeToggle />
                </header>

                <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-[1400px] px-4 py-7 md:px-8 md:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AppShell;
