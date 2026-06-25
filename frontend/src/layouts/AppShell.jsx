import { Database, LogOut, MessageSquare, Settings, UserCircle2 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: Database },
    { to: "/chat", label: "Chats", icon: MessageSquare },
    { to: "/settings", label: "Settings", icon: Settings }
];

function AppShell() {
    const { user, logout } = useAuth();

    return (
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8">
            <div className="grid min-h-[88vh] grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
                <aside className="panel p-4">
                    <div className="mb-8">
                        <p className="font-heading text-xl font-bold text-ink">OmniQuery AI</p>
                        <p className="text-sm text-slate-500">Async RAG workspace</p>
                    </div>
                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-xl px-3 py-2 font-medium transition ${isActive ? "bg-ink text-white" : "text-slate-700 hover:bg-slate-100"
                                        }`
                                    }
                                >
                                    <Icon size={18} />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>

                    <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4">
                        <div className="flex items-center gap-3">
                            <UserCircle2 className="text-tide" size={20} />
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">Signed in as</p>
                                <p className="text-sm font-semibold text-slate-800">{user?.email || "Unknown user"}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </aside>
                <main className="panel p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppShell;
