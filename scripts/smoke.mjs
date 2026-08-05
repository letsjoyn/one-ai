import fs from "node:fs/promises";
import path from "node:path";

const frontendUrl = process.env.FRONTEND_URL;
const gatewayUrl = process.env.GATEWAY_URL;
const workerUrl = process.env.WORKER_URL;
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const pdfPath = process.env.SMOKE_PDF_PATH;
const query = process.env.SMOKE_QUERY || "Summarize the uploaded document.";

if (!frontendUrl || !gatewayUrl) {
    throw new Error("FRONTEND_URL and GATEWAY_URL are required");
}

async function request(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();
    let body;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = text;
    }
    if (!response.ok) {
        const error = new Error(`${options.method || "GET"} ${url} returned ${response.status}`);
        error.status = response.status;
        error.body = body;
        throw error;
    }
    return body;
}

async function waitForDocument(token, documentId) {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
        const result = await request(`${gatewayUrl}/api/documents`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const document = result.documents.find((item) => item.documentId === documentId);
        if (document?.status === "ready") {
            return document;
        }
        if (document?.status === "failed") {
            throw new Error(`Smoke document processing failed: ${document.error || "unknown error"}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error("Timed out waiting for smoke document processing");
}

console.log("Checking deployed health endpoints...");
await request(`${gatewayUrl}/api/health`);
if (workerUrl) {
    await request(`${workerUrl}/health`);
}
const frontendResponse = await fetch(frontendUrl);
if (!frontendResponse.ok || !(await frontendResponse.text()).includes("root")) {
    throw new Error("Frontend smoke check failed");
}

if (!email || !password) {
    console.log("Health smoke passed. Set SMOKE_EMAIL and SMOKE_PASSWORD for authenticated checks.");
    process.exit(0);
}

let auth;
try {
    auth = await request(`${gatewayUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (auth.requiresVerification) {
        throw new Error("Smoke account requires email verification; verify it once, then rerun");
    }
} catch (error) {
    if (error.status !== 409) {
        throw error;
    }
    auth = await request(`${gatewayUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
}

const token = auth.token;
const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
};
await request(`${gatewayUrl}/api/auth/me`, { headers });
await request(`${gatewayUrl}/api/team`, { headers });

const created = await request(`${gatewayUrl}/api/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "Production smoke test" })
});

let documentId;
try {
    if (pdfPath) {
        const absolutePdfPath = path.resolve(pdfPath);
        const bytes = await fs.readFile(absolutePdfPath);
        const fileName = path.basename(absolutePdfPath);
        documentId = crypto.randomUUID();
        const upload = await request(`${gatewayUrl}/api/documents/upload-url`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                fileName,
                mimeType: "application/pdf",
                fileSize: bytes.length
            })
        });

        const formData = new FormData();
        formData.append("cacheControl", "3600");
        formData.append("", new Blob([bytes], { type: "application/pdf" }), fileName);
        await request(upload.signedUrl, {
            method: "PUT",
            headers: { "x-upsert": "false" },
            body: formData
        });

        await request(`${gatewayUrl}/api/documents/upload-complete`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                filePath: upload.filePath,
                documentId,
                fileName
            })
        });
        await waitForDocument(token, documentId);

        const answer = await request(`${gatewayUrl}/api/chat`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                query,
                conversationId: created.conversation.id
            })
        });
        if (!answer.answer || !Array.isArray(answer.sources)) {
            throw new Error("Authenticated chat smoke check returned an invalid response");
        }
    }
} finally {
    if (documentId) {
        await request(`${gatewayUrl}/api/documents/${documentId}`, {
            method: "DELETE",
            headers
        });
    }
    await request(`${gatewayUrl}/api/conversations/${created.conversation.id}`, {
        method: "DELETE",
        headers
    });
}

console.log("Production smoke checks passed.");
