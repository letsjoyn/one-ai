import { FileText, Loader2, Trash2 } from "lucide-react";

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
    const map = {
        ready: "badge badge-ready",
        failed: "badge badge-failed",
        queued: "badge badge-processing",
        processing: "badge badge-processing",
    };
    const labels = { ready: "Ready", failed: "Failed", queued: "Queued", processing: "Processing" };
    return (
        <span className={map[status] || map.processing}>
            {labels[status] || "Processing"}
        </span>
    );
}

function DocumentTable({ rows, loading = false, deletingId = "", onDelete }) {
    if (!rows.length) {
        return (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
                <span className="grid h-10 w-10 place-items-center rounded border border-line bg-subtle">
                    <FileText size={18} className="text-secondary" />
                </span>
                <p className="mt-4 text-[13px] font-semibold">
                    {loading ? "Loading documents…" : "No documents yet"}
                </p>
                <p className="mt-1 text-[12px] text-secondary max-w-[200px]">
                    {loading ? "Checking your workspace." : "Upload a file to build your knowledge base."}
                </p>
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_130px_60px_90px_36px] items-center border-b border-line bg-subtle px-4 py-2.5 gap-3">
                <span className="eyebrow">Document</span>
                <span className="eyebrow hidden sm:block text-right">Uploaded</span>
                <span className="eyebrow text-right">Chunks</span>
                <span className="eyebrow text-right">Status</span>
                <span />
            </div>

            {/* Rows */}
            <ul className="divide-y divide-line">
                {rows.map((row) => (
                    <li
                        key={row.id}
                        className="grid grid-cols-[1fr_130px_60px_90px_36px] items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/50 group"
                    >
                        {/* Name */}
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-subtle">
                                <FileText size={13} className="text-secondary" />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium leading-tight" title={row.name}>
                                    {row.name}
                                </p>
                                {row.error && (
                                    <p className="mt-0.5 truncate text-[11px] text-[rgb(var(--danger))]" title={row.error}>
                                        {row.error}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Date */}
                        <span className="hidden sm:block text-right text-[11px] tabular-nums text-secondary">
                            {formatDate(row.uploadedAt)}
                        </span>

                        {/* Chunks */}
                        <span className="text-right text-[12px] tabular-nums text-secondary font-medium">
                            {row.chunks ?? "—"}
                        </span>

                        {/* Status */}
                        <div className="flex justify-end">
                            <StatusBadge status={row.status} />
                        </div>

                        {/* Delete */}
                        <button
                            type="button"
                            onClick={() => onDelete(row)}
                            disabled={deletingId === row.id}
                            aria-label={`Delete ${row.name}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex h-7 w-7 items-center justify-center rounded text-secondary transition-all hover:bg-red-50 hover:text-[rgb(var(--danger))] dark:hover:bg-red-950/30 disabled:cursor-wait"
                        >
                            {deletingId === row.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Trash2 size={13} />
                            }
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DocumentTable;
