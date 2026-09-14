import { Check, Database, Link2, Moon, ShieldCheck, Sun } from "lucide-react";
import TeamSettings from "../components/TeamSettings";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Section({ title, subtitle, children }) {
    return (
        <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
                <p className="text-[13px] font-semibold">{title}</p>
                {subtitle && <p className="mt-0.5 text-[12px] text-secondary">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

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
        <div className="max-w-3xl space-y-8">
            {/* Header */}
            <div>
                <p className="eyebrow mb-2">Configuration</p>
                <h1 className="text-[1.6rem] font-semibold tracking-tight">Settings</h1>
                <p className="mt-1.5 text-[13px] text-secondary">
                    Manage your workspace preferences and connection details.
                </p>
            </div>

            {/* Appearance */}
            <Section title="Appearance" subtitle="Theme preference is saved in this browser.">
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {[
                        { value: "light", label: "Light mode", icon: Sun, desc: "White background, dark text" },
                        { value: "dark", label: "Dark mode", icon: Moon, desc: "Dark background, light text" }
                    ].map(({ value, label, icon: Icon, desc }) => {
                        const selected = theme === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => !selected && toggleTheme()}
                                className={`flex items-start gap-4 rounded border p-4 text-left transition-colors ${
                                    selected
                                        ? "border-accent bg-accent/5"
                                        : "border-line hover:bg-subtle"
                                }`}
                            >
                                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded border ${
                                    selected ? "border-accent/40 bg-accent/10 text-accent" : "border-line bg-subtle text-secondary"
                                }`}>
                                    <Icon size={15} />
                                </span>
                                <span className="flex-1">
                                    <span className="block text-[13px] font-semibold">{label}</span>
                                    <span className="mt-0.5 block text-[12px] text-secondary">{desc}</span>
                                </span>
                                {selected && <Check size={15} className="mt-0.5 shrink-0 text-accent" />}
                            </button>
                        );
                    })}
                </div>
            </Section>

            {/* Team */}
            <TeamSettings />

            {/* Connection */}
            <Section title="Connection" subtitle="Runtime values used by the current frontend session.">
                <div className="divide-y divide-line">
                    {connectionRows.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                            <div className="flex items-center gap-2.5">
                                <Icon size={14} className="text-secondary" />
                                <p className="text-[12px] text-secondary">{label}</p>
                            </div>
                            <p className="mono min-w-0 break-all text-primary sm:text-right">{value}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* RAG mode */}
            <Section title="Processing mode">
                <div className="flex items-center justify-between px-5 py-4">
                    <div>
                        <p className="text-[13px] font-medium">RAG — Retrieval-augmented generation</p>
                        <p className="mt-0.5 text-[12px] text-secondary">
                            Documents are queued, chunked, embedded, and retrieved via vector search.
                        </p>
                    </div>
                    <span className="badge badge-ready ml-4 shrink-0">Active</span>
                </div>
            </Section>
        </div>
    );
}

export default SettingsPage;
