import axios from "axios";
import { env } from "../utils/env.js";

const aiClient = axios.create({
    baseURL: env.AI_WORKER_URL,
    timeout: 120000
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
