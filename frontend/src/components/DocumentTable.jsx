import { FileText, Trash2 } from "lucide-react";

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function StatusBadge({ status }) {
    const statuses = {
        ready: { className: "badge-ready", label: "Ready" },
        failed: { className: "badge-failed", label: "Failed" },
        queued: { className: "badge-processing", label: "Queued" },
        processing: { className: "badge-processing", label: "Processing" }
    };
    const current = statuses[status] || statuses.processing;

    return (
        <span className={`inline-flex h-6 items-center px-2 text-[11px] font-semibold ${current.className}`}>
            {current.label}
        </span>
    );
}

function DocumentTable({ rows, loading = false, deletingId = "", onDelete }) {
    return (
        <div className="overflow-x-auto border border-line bg-surface">
            <table className="min-w-[680px] w-full table-fixed text-left text-sm">
                <thead>
                    <tr className="border-b border-line bg-subtle">
                        <th className="w-[45%] px-4 py-3 text-xs font-semibold text-secondary">Document</th>
                        <th className="w-[24%] px-4 py-3 text-xs font-semibold text-secondary">Uploaded</th>
                        <th className="w-[14%] px-4 py-3 text-xs font-semibold text-secondary">Chunks</th>
                        <th className="w-[13%] px-4 py-3 text-xs font-semibold text-secondary">Status</th>
                        <th className="w-[4%] px-3 py-3 text-right text-xs font-semibold text-secondary">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id} className="border-b border-line last:border-b-0 hover:bg-subtle/60">
                            <td className="px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <FileText size={17} className="shrink-0 text-secondary" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium" title={row.name}>{row.name}</p>
                                        {row.error && <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">{row.error}</p>}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-secondary">{formatDate(row.uploadedAt)}</td>
                            <td className="px-4 py-3 text-xs tabular-nums text-secondary">{row.chunks ?? "-"}</td>
                            <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                            <td className="px-3 py-3 text-right">
                                <button
                                    type="button"
                                    className="icon-button h-8 w-8 border-0 text-secondary hover:text-red-600"
                                    onClick={() => onDelete(row)}
                                    disabled={deletingId === row.id}
                                    aria-label={`Delete ${row.name}`}
                                    title="Delete document"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {!rows.length && (
                        <tr>
                            <td className="px-4 py-14 text-center" colSpan={5}>
                                <FileText className="mx-auto text-secondary" size={22} />
                                <p className="mt-3 text-sm font-medium">{loading ? "Loading documents..." : "No documents yet"}</p>
                                <p className="mt-1 text-xs text-secondary">
                                    {loading ? "Checking your workspace." : "Upload a PDF to start building your knowledge base."}
                                </p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DocumentTable;
