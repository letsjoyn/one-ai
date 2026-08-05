import { Check, Database, Link2, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TeamSettings from "../components/TeamSettings";

function SettingsPage() {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:8080";

    const connectionRows = [
        { label: "Gateway endpoint", value: gatewayUrl, icon: Link2 },
        { label: "Workspace tenant", value: user?.tenantId || "Unavailable", icon: Database },
        { label: "Authenticated user", value: user?.userId || "Unavailable", icon: ShieldCheck }
    ];

    return (
        <div className="max-w-4xl space-y-7">
            <div>
                <p className="eyebrow">Preferences</p>
                <h1 className="mt-2 text-2xl font-semibold">Workspace settings</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                    Review the current connection and choose how OmniQuery appears on this device.
                </p>
            </div>

            <section className="border border-line bg-surface">
                <div className="border-b border-line px-5 py-4">
                    <h2 className="text-sm font-semibold">Appearance</h2>
                    <p className="mt-1 text-xs text-secondary">Theme preference is saved in this browser.</p>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {[
                        { value: "light", label: "Light", icon: Sun },
                        { value: "dark", label: "Dark", icon: Moon }
                    ].map((option) => {
                        const Icon = option.icon;
                        const selected = theme === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    if (!selected) {
                                        toggleTheme();
                                    }
                                }}
                                className={`flex min-h-20 items-center gap-4 border p-4 text-left transition ${
                                    selected ? "border-accent bg-accent/5" : "border-line hover:bg-subtle"
                                }`}
                            >
                                <span className="grid h-9 w-9 place-items-center border border-line bg-surface text-secondary">
                                    <Icon size={17} />
                                </span>
                                <span className="flex-1">
                                    <span className="block text-sm font-semibold">{option.label}</span>
                                    <span className="mt-1 block text-xs text-secondary">{option.label} interface</span>
                                </span>
                                {selected && <Check size={17} className="text-accent" />}
                            </button>
                        );
                    })}
                </div>
            </section>

            <TeamSettings />

            <section className="border border-line bg-surface">
                <div className="border-b border-line px-5 py-4">
                    <h2 className="text-sm font-semibold">Connection</h2>
                    <p className="mt-1 text-xs text-secondary">Runtime values used by the current frontend session.</p>
                </div>
                <div className="divide-y divide-line">
                    {connectionRows.map((row) => {
                        const Icon = row.icon;
                        return (
                            <div key={row.label} className="grid gap-3 px-5 py-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
                                <div className="flex items-center gap-3">
                                    <Icon size={16} className="text-secondary" />
                                    <p className="text-xs font-medium text-secondary">{row.label}</p>
                                </div>
                                <p className="min-w-0 break-all font-mono text-xs text-primary sm:text-right">{row.value}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="border border-line bg-surface">
                <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                        <h2 className="text-sm font-semibold">RAG processing mode</h2>
                        <p className="mt-1 text-xs leading-5 text-secondary">
                            Documents are queued for asynchronous processing and retrieved through vector search.
                        </p>
                    </div>
                    <span className="inline-flex h-7 items-center border border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Enabled
                    </span>
                </div>
            </section>
        </div>
    );
}

export default SettingsPage;
