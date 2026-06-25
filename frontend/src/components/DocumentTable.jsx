function formatDate(isoDate) {
    return new Date(isoDate).toLocaleString();
}

function StatusBadge({ status }) {
    const badgeClass = status === "ready" ? "badge-ready" : "badge-processing";
    const label = status === "ready" ? "Ready" : "Processing";

    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>{label}</span>;
}

function DocumentTable({ rows }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 font-semibold">File Name</th>
                        <th className="px-4 py-3 font-semibold">Upload Date</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                            <td className="px-4 py-3">{row.name}</td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(row.uploadedAt)}</td>
                            <td className="px-4 py-3">
                                <StatusBadge status={row.status} />
                            </td>
                        </tr>
                    ))}
                    {!rows.length && (
                        <tr>
                            <td className="px-4 py-6 text-slate-500" colSpan={3}>
                                No documents uploaded yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DocumentTable;
