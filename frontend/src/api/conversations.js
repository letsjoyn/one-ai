import { api } from "./client";

export async function fetchConversations() {
    const response = await api.get("/api/conversations");
    return response.data.conversations || [];
}

export async function createConversation(title = "New conversation") {
    const response = await api.post("/api/conversations", { title });
    return response.data.conversation;
}

export async function renameConversation(conversationId, title) {
    const response = await api.patch(`/api/conversations/${conversationId}`, { title });
    return response.data.conversation;
}

export async function removeConversation(conversationId) {
    await api.delete(`/api/conversations/${conversationId}`);
}
