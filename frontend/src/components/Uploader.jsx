import { AlertCircle, CheckCircle2, FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { markUploadComplete, requestUpload, uploadToSupabase } from "../api/documents";

function Uploader({ onUploaded }) {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(false);
    const [fileName, setFileName] = useState("");
    const [message, setMessage] = useState(null);

    async function handleFile(file) {
        setMessage(null);

        if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
            setMessage({ type: "error", text: "Choose a PDF file to continue." });
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            setMessage({ type: "error", text: "PDF files must be 25 MB or smaller." });
            return;
        }

        setBusy(true);
        setFileName(file.name);
        setProgress(10);

        try {
            const documentId = crypto.randomUUID();
            const uploadInfo = await requestUpload(file);
            setProgress(35);

            await uploadToSupabase(file, uploadInfo.signedUrl);
            setProgress(75);

            await markUploadComplete(uploadInfo.filePath, documentId, file.name);
            setProgress(100);

            onUploaded({
                id: documentId,
                name: file.name,
                status: "processing",
                uploadedAt: new Date().toISOString()
            });
            setMessage({ type: "success", text: "Upload complete. Indexing has started." });
        } catch (error) {
            console.error(error);
            setMessage({
                type: "error",
                text: error?.response?.data?.error || "Upload failed. Check the gateway and storage configuration."
            });
        } finally {
            setBusy(false);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    function onDrop(event) {
        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files?.[0]);
    }

    return (
        <div className="border border-line bg-surface">
            <button
                type="button"
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !busy && inputRef.current?.click()}
                disabled={busy}
                className={`flex min-h-56 w-full flex-col items-center justify-center border-b border-line px-6 py-8 text-center transition ${
                    isDragging ? "bg-accent/10" : "bg-surface hover:bg-subtle"
                } disabled:cursor-wait`}
            >
                <span className="grid h-11 w-11 place-items-center border border-line bg-subtle text-secondary">
                    {busy ? <FileText size={20} /> : <Upload size={20} />}
                </span>
                <p className="mt-5 text-sm font-semibold">
                    {busy ? "Uploading document" : "Drop PDF or select file"}
                </p>
                <p className="mt-2 max-w-[260px] text-xs leading-5 text-secondary">
                    {busy && fileName ? fileName : "Files are sent directly to configured storage before indexing."}
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                />
            </button>

            <div className="p-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">{busy ? "Upload progress" : "Accepted format"}</span>
                    <span className="font-medium tabular-nums">{busy ? `${progress}%` : "PDF"}</span>
                </div>
                <div className="mt-3 h-1 bg-subtle">
                    <div
                        className="h-1 bg-accent transition-all duration-300"
                        style={{ width: busy || progress === 100 ? `${progress}%` : "0%" }}
                    />
                </div>

                {message && (
                    <div
                        className={`mt-4 flex items-start gap-2 border px-3 py-2 text-xs ${
                            message.type === "success"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                        }`}
                    >
                        {message.type === "success"
                            ? <CheckCircle2 className="mt-0.5 shrink-0" size={14} />
                            : <AlertCircle className="mt-0.5 shrink-0" size={14} />}
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Uploader;
