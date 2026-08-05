export function serializeConversation(conversation) {
    const value = conversation.toObject ? conversation.toObject() : conversation;
    return {
        id: value._id.toString(),
        title: value.title,
        messages: (value.messages || []).map((message) => ({
            id: message._id?.toString(),
            role: message.role,
            text: message.text,
            sources: message.sources || [],
            error: Boolean(message.error),
            createdAt: message.createdAt
        })),
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
    };
}
