import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { markUploadComplete, requestUpload, uploadToSupabase } from "../api/documents";

function Uploader({ onUploaded }) {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(false);

    async function handleFile(file) {
        if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
            return;
        }

        setBusy(true);
        setProgress(10);

        try {
            const documentId = crypto.randomUUID();
            const uploadInfo = await requestUpload(file);
            setProgress(35);

            await uploadToSupabase(file, uploadInfo.signedUrl);
            setProgress(75);

            await markUploadComplete(uploadInfo.filePath, documentId);
            setProgress(100);

            onUploaded({
                id: documentId,
                name: file.name,
                status: "processing",
                uploadedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error(error);
            alert("Upload failed. Check Gateway and Supabase setup.");
        } finally {
            setTimeout(() => setProgress(0), 900);
            setBusy(false);
        }
    }

    function onDrop(event) {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        handleFile(file);
    }

    return (
        <section className="space-y-4">
            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${isDragging ? "border-ember bg-orange-50" : "border-tide/50 hover:border-tide"
                    }`}
            >
                <UploadCloud className="mx-auto mb-3 text-tide" size={42} />
                <p className="font-heading text-lg">Drop your PDF here</p>
                <p className="text-sm text-slate-500">or click to browse and upload securely</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
            </div>

            {busy && (
                <div className="h-3 w-full rounded-full bg-slate-200">
                    <div
                        className="h-3 rounded-full bg-gradient-to-r from-tide to-emerald-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </section>
    );
}

export default Uploader;
