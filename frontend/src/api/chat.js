import { api } from "./client";

export async function askQuestion(query, conversationId) {
    const response = await api.post("/api/chat", {
        query,
        conversationId
    });

    return response.data;
}
