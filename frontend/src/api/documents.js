import axios from "axios";
import { api } from "./client";

export async function requestUpload(file) {
    const response = await api.post("/api/documents/upload-url", {
        fileName: file.name,
        mimeType: file.type || "application/pdf"
    });

    return response.data;
}

export async function uploadToSupabase(file, signedUrl) {
    await axios.put(signedUrl, file, {
        headers: {
            "Content-Type": file.type || "application/pdf"
        }
    });
}

export async function markUploadComplete(filePath, documentId) {
    const response = await api.post("/api/documents/upload-complete", {
        filePath,
        documentId
    });

    return response.data;
}

export async function fetchDocuments(limit = 50) {
    const response = await api.get("/api/documents", {
        params: { limit }
    });

    return response.data.documents || [];
}
