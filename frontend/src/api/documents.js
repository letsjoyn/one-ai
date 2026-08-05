import axios from "axios";
import { api } from "./client";

export async function requestUpload(file) {
    const response = await api.post("/api/documents/upload-url", {
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        fileSize: file.size
    });

    return response.data;
}

export async function uploadToSupabase(file, signedUrl) {
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);

    await axios.put(signedUrl, formData, {
        headers: {
            "x-upsert": "false"
        }
    });
}

export async function markUploadComplete(filePath, documentId, fileName) {
    const response = await api.post("/api/documents/upload-complete", {
        filePath,
        documentId,
        fileName
    });

    return response.data;
}

export async function fetchDocuments(limit = 50) {
    const response = await api.get("/api/documents", {
        params: { limit }
    });

    return response.data.documents || [];
}

export async function deleteDocument(documentId) {
    const response = await api.delete(`/api/documents/${documentId}`);
    return response.data;
}
