import axios from "axios";
import { env } from "../utils/env.js";

const aiClient = axios.create({
    baseURL: env.AI_WORKER_URL,
    timeout: 120000,
    headers: {
        "X-Internal-API-Key": env.INTERNAL_API_KEY
    }
});

export async function queryRag(payload) {
    const response = await aiClient.post("/api/chat", payload);
    return response.data;
}

export async function getDocumentStatuses(userId, limit = 50) {
    const response = await aiClient.get("/api/documents", {
        params: {
            userId,
            limit
        }
    });
    return response.data;
}

export async function deleteDocumentData(userId, documentId) {
    const response = await aiClient.delete(`/api/documents/${documentId}`, {
        params: { userId }
    });
    return response.data;
}
