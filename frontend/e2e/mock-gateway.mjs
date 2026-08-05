import http from "node:http";
import crypto from "node:crypto";

const host = "127.0.0.1";
const port = 8089;
const user = {
    userId: "507f1f77bcf86cd799439011",
    email: "engineer@example.com",
    tenantId: "workspace-e2e",
    role: "admin",
    emailVerified: true
};

const documents = [];
const conversations = [];
const invitations = [];

function tokenFor(payload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `eyJhbGciOiJub25lIn0.${encoded}.e2e`;
}

function send(res, status, body) {
    res.statusCode = status;
    res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:4174");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, x-upsert");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (status === 204) {
        res.end();
        return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
}

async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    if (!chunks.length) {
        return {};
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function serializeConversation(conversation) {
    return {
        ...conversation,
        updatedAt: conversation.updatedAt || new Date().toISOString()
    };
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
        send(res, 204);
        return;
    }

    if (req.method === "GET" && path === "/api/health") {
        send(res, 200, { status: "ok", service: "mock-gateway" });
        return;
    }

    if (req.method === "POST" && path === "/api/auth/register") {
        const body = await readJson(req);
        user.email = body.email;
        send(res, 201, { token: tokenFor(user), user });
        return;
    }

    if (req.method === "POST" && path === "/api/auth/login") {
        send(res, 200, { token: tokenFor(user), user });
        return;
    }

    if (req.method === "GET" && path === "/api/auth/me") {
        send(res, 200, { user });
        return;
    }

    if (req.method === "POST" && path === "/api/documents/upload-url") {
        send(res, 200, {
            filePath: `tenants/${user.tenantId}/${crypto.randomUUID()}-handbook.pdf`,
            signedUrl: `http://${host}:${port}/storage/upload`,
            token: "mock-upload-token",
            mimeType: "application/pdf"
        });
        return;
    }

    if (req.method === "PUT" && path === "/storage/upload") {
        for await (const _chunk of req) {
            // Consume the multipart upload.
        }
        send(res, 200, {});
        return;
    }

    if (req.method === "POST" && path === "/api/documents/upload-complete") {
        const body = await readJson(req);
        documents.unshift({
            documentId: body.documentId,
            displayName: body.fileName,
            filePath: body.filePath,
            status: "ready",
            chunks: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            error: null
        });
        send(res, 200, { message: "Document queued for AI processing.", messageId: "mock-job" });
        return;
    }

    if (req.method === "GET" && path === "/api/documents") {
        send(res, 200, { documents });
        return;
    }

    if (req.method === "DELETE" && path.startsWith("/api/documents/")) {
        const documentId = path.split("/").pop();
        const index = documents.findIndex((document) => document.documentId === documentId);
        if (index >= 0) {
            documents.splice(index, 1);
        }
        send(res, 200, { status: "deleted", documentId });
        return;
    }

    if (req.method === "GET" && path === "/api/conversations") {
        send(res, 200, { conversations: conversations.map(serializeConversation) });
        return;
    }

    if (req.method === "POST" && path === "/api/conversations") {
        const conversation = {
            id: crypto.randomBytes(12).toString("hex"),
            title: "New conversation",
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        conversations.unshift(conversation);
        send(res, 201, { conversation: serializeConversation(conversation) });
        return;
    }

    if (req.method === "DELETE" && path.startsWith("/api/conversations/")) {
        const id = path.split("/").pop();
        const index = conversations.findIndex((conversation) => conversation.id === id);
        if (index >= 0) {
            conversations.splice(index, 1);
        }
        send(res, 204);
        return;
    }

    if (req.method === "POST" && path === "/api/chat") {
        const body = await readJson(req);
        const conversation = conversations.find((item) => item.id === body.conversationId);
        const now = new Date().toISOString();
        conversation.title = body.query.slice(0, 120);
        conversation.messages.push(
            { id: crypto.randomUUID(), role: "user", text: body.query, sources: [], createdAt: now },
            {
                id: crypto.randomUUID(),
                role: "assistant",
                text: "The employee handbook grants 20 paid vacation days each year [1].",
                sources: [{
                    sourcePath: "handbook.pdf",
                    chunk: 2,
                    documentId: documents[0]?.documentId || "mock-document",
                    snippet: "Full-time employees receive 20 paid vacation days per calendar year."
                }],
                createdAt: now
            }
        );
        conversation.updatedAt = now;
        send(res, 200, {
            answer: conversation.messages.at(-1).text,
            sources: conversation.messages.at(-1).sources,
            conversation: serializeConversation(conversation)
        });
        return;
    }

    if (req.method === "GET" && path === "/api/team") {
        send(res, 200, { members: [user], invitations });
        return;
    }

    if (req.method === "POST" && path === "/api/team/invitations") {
        const body = await readJson(req);
        const invitation = {
            id: crypto.randomBytes(12).toString("hex"),
            email: body.email,
            role: body.role,
            status: "pending",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()
        };
        invitations.unshift(invitation);
        send(res, 201, { invitation });
        return;
    }

    if (req.method === "DELETE" && path.startsWith("/api/team/invitations/")) {
        const id = path.split("/").pop();
        const index = invitations.findIndex((invitation) => invitation.id === id);
        if (index >= 0) {
            invitations.splice(index, 1);
        }
        send(res, 204);
        return;
    }

    send(res, 404, { error: `Unhandled mock route: ${req.method} ${path}` });
});

server.listen(port, host, () => {
    console.log(`Mock gateway listening on http://${host}:${port}`);
});
