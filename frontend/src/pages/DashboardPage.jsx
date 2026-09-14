import { AlertCircle, CheckCircle2, Clock3, Files, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DocumentTable from "../components/DocumentTable";
import Uploader from "../components/Uploader";
import { deleteAllDocuments, deleteDocument, fetchDocuments } from "../api/documents";

function StatCard({ label, value, icon: Icon, accent }) {
    return (
        <div className="card flex items-center justify-between px-5 py-4">
            <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
            </div>
            <Icon size={18} className={accent} strokeWidth={1.8} />
        </div>
    );
}

function DashboardPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [deletingId, setDeletingId] = useState("");
    const [deletingAll, setDeletingAll] = useState(false);

    const metrics = useMemo(() => {
        const ready = documents.filter((d) => d.status === "ready").length;
        const failed = documents.filter((d) => d.status === "failed").length;
        const processing = documents.length - ready - failed;
        return [
            { label: "Total", value: documents.length, icon: Files, accent: "text-secondary" },
            { label: "Ready", value: ready, icon: CheckCircle2, accent: "text-[rgb(var(--success))]" },
            { label: "Processing", value: processing, icon: Clock3, accent: "text-[rgb(var(--warning))]" },
            { label: "Failed", value: failed, icon: AlertCircle, accent: "text-[rgb(var(--danger))]" },
        ];
    }, [documents]);

    function onUploaded(newDoc) {
        setDocuments((curr) => {
            const filtered = curr.filter((d) => d.id !== newDoc.id);
            return [newDoc, ...filtered];
        });
    }

    async function handleDelete(document) {
        if (!window.confirm(`Delete "${document.name}" and all indexed content?`)) return;
        setDeletingId(document.id);
        try {
            await deleteDocument(document.id);
            setDocuments((curr) => curr.filter((d) => d.id !== document.id));
            setLoadError("");
        } catch (err) {
            setLoadError(err?.response?.data?.error || "Could not delete the document.");
        } finally {
            setDeletingId("");
        }
    }

    async function handleDeleteAll() {
        if (!documents.length) return;
        if (!window.confirm(`Are you sure you want to delete ALL ${documents.length} documents? This will permanently remove all files and indexed data.`)) return;
        setDeletingAll(true);
        try {
            await deleteAllDocuments();
            setDocuments([]);
            setLoadError("");
        } catch (err) {
            setLoadError(err?.response?.data?.error || "Could not delete all documents.");
        } finally {
            setDeletingAll(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const docs = await fetchDocuments();
                if (!cancelled) {
                    const seen = new Set();
                    const unique = [];
                    for (const doc of docs) {
                        if (doc.documentId && !seen.has(doc.documentId)) {
                            seen.add(doc.documentId);
                            unique.push(doc);
                        }
                    }
                    setDocuments(unique.map((doc) => ({
                        id: doc.documentId,
                        name: doc.displayName || doc.filePath?.split("/").pop() || doc.documentId,
                        status: doc.status,
                        uploadedAt: doc.createdAt || doc.updatedAt || new Date().toISOString(),
                        chunks: doc.chunks,
                        error: doc.error,
                    })));
                    setLoadError("");
                }
            } catch {
                if (!cancelled) setLoadError("Could not refresh document status.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        const t = setInterval(load, 6000);
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div className="flex items-end justify-between">
                <div>
                    <p className="eyebrow mb-2">Knowledge base</p>
                    <h1 className="text-[1.6rem] font-semibold tracking-tight">Documents</h1>
                    <p className="mt-1.5 text-[13px] text-secondary">
                        Upload source material and monitor indexing.
                    </p>
                </div>
                <p className="text-[11px] text-secondary tabular-nums hidden sm:block">Auto-refreshes every 6s</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {metrics.map((m) => (
                    <StatCard key={m.label} {...m} />
                ))}
            </div>

            {/* Error */}
            {loadError && (
                <div className="flex items-center gap-2.5 rounded border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle size={14} className="shrink-0" />
                    {loadError}
                </div>
            )}

            {/* Two-column */}
            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                {/* Upload */}
                <section>
                    <p className="mb-3 text-[12px] font-semibold">Add documents</p>
                    <p className="mb-4 text-[12px] text-secondary">PDF, TXT, Markdown — multiple files at once.</p>
                    <Uploader onUploaded={onUploaded} />
                </section>

                {/* File list */}
                <section className="min-w-0">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[12px] font-semibold">Indexed files</p>
                            <p className="text-[11px] tabular-nums text-secondary">{documents.length} total</p>
                        </div>
                        {documents.length > 0 && (
                            <button
                                type="button"
                                onClick={handleDeleteAll}
                                disabled={deletingAll}
                                className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-colors disabled:opacity-50"
                            >
                                {deletingAll ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                {deletingAll ? "Deleting all…" : "Delete all files"}
                            </button>
                        )}
                    </div>
                    <DocumentTable
                        rows={documents}
                        loading={loading}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                    />
                </section>
            </div>
        </div>
    );
}

export default DashboardPage;
