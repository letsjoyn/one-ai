import { AlertCircle, CheckCircle2, Clock3, Files } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DocumentTable from "../components/DocumentTable";
import Uploader from "../components/Uploader";
import { deleteDocument, fetchDocuments } from "../api/documents";

function DashboardPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [deletingId, setDeletingId] = useState("");

    const metrics = useMemo(() => {
        const ready = documents.filter((document) => document.status === "ready").length;
        const failed = documents.filter((document) => document.status === "failed").length;
        const processing = documents.length - ready - failed;

        return [
            { label: "Total files", value: documents.length, icon: Files },
            { label: "Ready", value: ready, icon: CheckCircle2 },
            { label: "Processing", value: processing, icon: Clock3 },
            { label: "Failed", value: failed, icon: AlertCircle }
        ];
    }, [documents]);

    function onUploaded(newDocument) {
        setDocuments((current) => {
            const filtered = current.filter((item) => item.id !== newDocument.id);
            return [newDocument, ...filtered];
        });
    }

    async function handleDelete(document) {
        if (!window.confirm(`Delete "${document.name}" and all indexed content?`)) {
            return;
        }

        setDeletingId(document.id);
        try {
            await deleteDocument(document.id);
            setDocuments((current) => current.filter((item) => item.id !== document.id));
            setLoadError("");
        } catch (error) {
            console.error("Failed to delete document", error);
            setLoadError(error?.response?.data?.error || "Could not delete the document.");
        } finally {
            setDeletingId("");
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function loadDocuments() {
            try {
                const docs = await fetchDocuments();
                if (!cancelled) {
                    const uniqueDocs = [];
                    const seenIds = new Set();
                    for (const doc of docs) {
                        if (doc.documentId && !seenIds.has(doc.documentId)) {
                            seenIds.add(doc.documentId);
                            uniqueDocs.push(doc);
                        }
                    }
                    setDocuments(
                        uniqueDocs.map((document) => ({
                            id: document.documentId,
                            name: document.displayName || document.filePath?.split("/").pop() || document.documentId,
                            status: document.status,
                            uploadedAt: document.createdAt || document.updatedAt || new Date().toISOString(),
                            chunks: document.chunks,
                            error: document.error
                        }))
                    );
                    setLoadError("");
                }
            } catch (error) {
                console.error("Failed to load documents", error);
                if (!cancelled) {
                    setLoadError("Could not refresh document status. Check the gateway and AI worker.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDocuments();
        const timer = setInterval(loadDocuments, 6000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="space-y-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="eyebrow">Knowledge base</p>
                    <h1 className="mt-2 text-2xl font-semibold">Document library</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                        Upload source material and monitor indexing before using it in chat.
                    </p>
                </div>
                <p className="text-xs text-secondary">Status refreshes every 6 seconds</p>
            </div>

            <section className="grid border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={metric.label}
                            className={`flex min-h-24 items-center justify-between p-4 ${
                                index < metrics.length - 1 ? "border-b border-line sm:border-b-0 sm:border-r" : ""
                            } ${index === 1 ? "sm:border-r-0 xl:border-r" : ""}`}
                        >
                            <div>
                                <p className="text-xs font-medium text-secondary">{metric.label}</p>
                                <p className="mt-2 text-2xl font-semibold tabular-nums">{metric.value}</p>
                            </div>
                            <Icon size={20} className="text-secondary" strokeWidth={1.7} />
                        </div>
                    );
                })}
            </section>

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <section>
                    <div className="mb-3">
                        <h2 className="text-sm font-semibold">Add a document</h2>
                        <p className="mt-1 text-xs text-secondary">PDF, text, and Markdown files are uploaded directly to private storage.</p>
                    </div>
                    <Uploader onUploaded={onUploaded} />
                </section>

                <section className="min-w-0">
                    <div className="mb-3 flex items-end justify-between">
                        <div>
                            <h2 className="text-sm font-semibold">Files</h2>
                            <p className="mt-1 text-xs text-secondary">Indexed files become available to the chat assistant.</p>
                        </div>
                        <p className="text-xs tabular-nums text-secondary">{documents.length} total</p>
                    </div>

                    {loadError && (
                        <div className="mb-3 flex items-start gap-2 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                            <AlertCircle className="mt-0.5 shrink-0" size={14} />
                            {loadError}
                        </div>
                    )}

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
