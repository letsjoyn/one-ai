import { useEffect, useState } from "react";
import DocumentTable from "../components/DocumentTable";
import Uploader from "../components/Uploader";
import { fetchDocuments } from "../api/documents";

function DashboardPage() {
    const [documents, setDocuments] = useState([]);

    function onUploaded(newDoc) {
        setDocuments((prev) => [newDoc, ...prev]);
    }

    useEffect(() => {
        let cancelled = false;

        async function loadDocuments() {
            try {
                const docs = await fetchDocuments();
                if (!cancelled) {
                    setDocuments(
                        docs.map((doc) => ({
                            id: doc.documentId,
                            name: doc.filePath?.split("/").pop() || doc.documentId,
                            status: doc.status,
                            uploadedAt: doc.createdAt || doc.updatedAt || new Date().toISOString()
                        }))
                    );
                }
            } catch (error) {
                console.error("Failed to load documents", error);
            }
        }

        loadDocuments();
        const timer = setInterval(() => {
            loadDocuments();
        }, 6000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-heading text-2xl font-bold">Knowledge Dashboard</h1>
                <p className="text-slate-500">Upload and manage your source documents for asynchronous RAG.</p>
            </header>

            <Uploader onUploaded={onUploaded} />
            <DocumentTable rows={documents} />
        </div>
    );
}

export default DashboardPage;
