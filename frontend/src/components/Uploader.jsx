import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { markUploadComplete, requestUpload, uploadToSupabase } from "../api/documents";

const MAX_BYTES = 25 * 1024 * 1024;
const EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];
const FORMAT_LABEL = "PDF · TXT · MD";

const STATUS_ICON = {
    pending: <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--warning))] opacity-60" />,
    uploading: <Loader2 size={12} className="animate-spin text-accent" />,
    success: <CheckCircle2 size={12} className="text-[rgb(var(--success))]" />,
    error: <AlertCircle size={12} className="text-[rgb(var(--danger))]" />,
};

function FileRow({ f }) {
    return (
        <div className="flex items-center gap-3 rounded border border-line bg-subtle px-3 py-2">
            <FileText size={12} className="shrink-0 text-secondary" />
            <p className="mono flex-1 truncate text-[11px] text-primary" title={f.name}>{f.name}</p>
            {f.status === "uploading" && (
                <span className="tabular-nums text-[11px] text-secondary">{f.progress}%</span>
            )}
            {STATUS_ICON[f.status]}
        </div>
    );
}

function Uploader({ onUploaded }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [queue, setQueue] = useState([]);
    const [busy, setBusy] = useState(false);
    const [globalError, setGlobalError] = useState("");

    function patchFile(id, patch) {
        setQueue((q) => q.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    }

    async function process(files) {
        const valid = [], errors = [];
        for (const file of files) {
            const ok = EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
            if (!ok) { errors.push(`${file.name}: unsupported format`); continue; }
            if (file.size > MAX_BYTES) { errors.push(`${file.name}: exceeds 25 MB`); continue; }
            valid.push(file);
        }
        if (errors.length) setGlobalError(errors.join("  ·  "));
        if (!valid.length) return;

        const entries = valid.map((file) => ({
            id: crypto.randomUUID(), name: file.name, file,
            status: "pending", progress: 0,
        }));
        setQueue((q) => [...q, ...entries]);
        setBusy(true);
        setGlobalError("");

        for (const entry of entries) {
            patchFile(entry.id, { status: "uploading", progress: 10 });
            try {
                const docId = crypto.randomUUID();
                const info = await requestUpload(entry.file);
                patchFile(entry.id, { progress: 35 });
                await uploadToSupabase(entry.file, info.signedUrl);
                patchFile(entry.id, { progress: 75 });
                await markUploadComplete(info.filePath, docId, entry.file.name, info.mimeType);
                patchFile(entry.id, { progress: 100, status: "success" });
                onUploaded({ id: docId, name: entry.file.name, status: "processing", uploadedAt: new Date().toISOString() });
            } catch (err) {
                patchFile(entry.id, { status: "error", error: err?.response?.data?.error || "Upload failed" });
            }
        }

        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
    }

    function onDrop(e) {
        e.preventDefault(); setDragging(false);
        process(Array.from(e.dataTransfer.files || []));
    }

    return (
        <div className="card overflow-hidden">
            {/* Drop zone */}
            <button
                type="button"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex min-h-40 w-full flex-col items-center justify-center gap-3 border-b border-line px-6 py-8 transition-colors ${
                    dragging ? "bg-accent/5" : "hover:bg-subtle/60"
                }`}
            >
                <span className={`grid h-10 w-10 place-items-center rounded border transition-colors ${
                    dragging ? "border-accent/40 bg-accent/10 text-accent" : "border-line bg-subtle text-secondary"
                }`}>
                    <Upload size={16} />
                </span>
                <div className="text-center">
                    <p className="text-[13px] font-semibold">
                        {dragging ? "Drop files" : "Drop files or click to browse"}
                    </p>
                    <p className="mt-1 text-[11px] text-secondary">{FORMAT_LABEL} · Max 25 MB · Multiple files</p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                    className="hidden"
                    onChange={(e) => process(Array.from(e.target.files || []))}
                />
            </button>

            {/* Queue */}
            {(queue.length > 0 || globalError) && (
                <div className="p-3 space-y-2.5">
                    {globalError && (
                        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            {globalError}
                        </div>
                    )}
                    {queue.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] text-secondary">
                                    {busy
                                        ? `Uploading ${queue.find((f) => f.status === "uploading")?.name ?? "…"}`
                                        : `${queue.filter((f) => f.status === "success").length} / ${queue.length} uploaded`}
                                </p>
                                {!busy && (
                                    <button
                                        type="button"
                                        onClick={() => { setQueue([]); setGlobalError(""); }}
                                        className="flex items-center gap-1 text-[11px] text-secondary hover:text-primary transition-colors"
                                    >
                                        <X size={11} /> Clear
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                {queue.map((f) => <FileRow key={f.id} f={f} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Uploader;
