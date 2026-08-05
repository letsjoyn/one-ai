import {
    Database,
    LogOut,
    Menu,
    MessageSquare,
    Settings,
    UserCircle2,
    X
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/dashboard", label: "Documents", icon: Database },
    { to: "/chat", label: "Chats", icon: MessageSquare },
    { to: "/settings", label: "Settings", icon: Settings }
];

const pageTitles = {
    "/dashboard": "Documents",
    "/chat": "Ask OmniQuery",
    "/settings": "Workspace settings"
};

function AppShell({ children }) {
    const { user, logout } = useAuth();
    const [location] = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    function closeMobileNav() {
        setMobileOpen(false);
    }

    return (
        <div className="min-h-screen bg-canvas text-primary">
            {mobileOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-black/45 md:hidden"
                    onClick={closeMobileNav}
                    aria-label="Close navigation"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-line bg-surface transition-transform duration-200 md:translate-x-0 ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex h-16 items-center justify-between border-b border-line px-5">
                    <Link to="/dashboard" onClick={closeMobileNav} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center bg-primary text-sm font-bold text-surface">
                            OQ
                        </span>
                        <div>
                            <p className="text-sm font-semibold leading-none">OmniQuery</p>
                            <p className="mt-1 text-[11px] text-secondary">AI workspace</p>
                        </div>
                    </Link>
                    <button
                        type="button"
                        className="icon-button border-0 md:hidden"
                        onClick={closeMobileNav}
                        aria-label="Close navigation"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-5">
                    <p className="eyebrow px-3 pb-2">Workspace</p>
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={closeMobileNav}
                                    className={(isActive) =>
                                        `flex h-10 items-center gap-3 border-l-2 px-3 text-sm font-medium transition ${
                                            isActive
                                                ? "border-accent bg-subtle text-primary"
                                                : "border-transparent text-secondary hover:bg-subtle hover:text-primary"
                                        }`
                                    }
                                >
                                    <Icon size={17} strokeWidth={1.8} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <div className="border-t border-line p-3">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <UserCircle2 className="shrink-0 text-secondary" size={20} />
                        <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-primary">{user?.email || "Unknown user"}</p>
                            <p className="text-[11px] capitalize text-secondary">{user?.role || "member"}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={logout}
                        className="flex h-9 w-full items-center gap-3 px-3 text-sm text-secondary transition hover:bg-subtle hover:text-primary"
                    >
                        <LogOut size={16} />
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="md:pl-[228px]">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur md:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            className="icon-button md:hidden"
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation"
                        >
                            <Menu size={18} />
                        </button>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{pageTitles[location] || "OmniQuery"}</p>
                            <p className="hidden text-xs text-secondary sm:block">Private document intelligence</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </header>

                <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default AppShell;
