import { defaultUserId } from "../api/client";

function SettingsPage() {
    const settings = [
        ["Current Demo User ID", defaultUserId],
        ["Gateway URL", import.meta.env.VITE_GATEWAY_URL || "http://localhost:8080"],
        ["RAG Mode", "Asynchronous queue + vector retrieval"]
    ];

    return (
        <div className="space-y-4">
            <h1 className="font-heading text-2xl font-bold">Settings</h1>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                {settings.map(([label, value]) => (
                    <div key={label} className="flex flex-col border-b border-slate-200 py-3 last:border-b-0 md:flex-row md:justify-between">
                        <p className="font-medium text-slate-700">{label}</p>
                        <p className="font-mono text-sm text-slate-500">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SettingsPage;
