import assert from "node:assert/strict";
import test from "node:test";

const { serializeConversation } = await import("../src/services/conversation.service.js");

test("conversation serialization produces browser-safe identifiers", () => {
    const serialized = serializeConversation({
        _id: { toString: () => "conversation-1" },
        title: "Benefits",
        messages: [{
            _id: { toString: () => "message-1" },
            role: "assistant",
            text: "Twenty days.",
            sources: [{ documentId: "document-1" }],
            createdAt: new Date("2026-08-05T00:00:00.000Z")
        }],
        createdAt: new Date("2026-08-05T00:00:00.000Z"),
        updatedAt: new Date("2026-08-05T00:01:00.000Z")
    });

    assert.equal(serialized.id, "conversation-1");
    assert.equal(serialized.messages[0].id, "message-1");
    assert.equal(serialized.messages[0].error, false);
    assert.equal(serialized.messages[0].sources[0].documentId, "document-1");
});
