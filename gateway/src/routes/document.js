import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../utils/env.js";
import { createSignedUploadUrl } from "../services/supabase.service.js";
import { queueDocumentProcessing } from "../services/qstash.service.js";
import { deleteDocumentData, getDocumentStatuses } from "../services/aiworker.service.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { documentOperations } from "../monitoring/metrics.js";

const router = express.Router();

const requestUploadSchema = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().default("application/pdf"),
    fileSize: z.number().int().positive()
});

const uploadCompleteSchema = z.object({
    filePath: z.string().min(1).max(1024),
    documentId: z.string().uuid(),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().default("application/octet-stream")
});

const supportedUploadTypes = [
    {
        extension: ".pdf",
        label: "PDF",
        mimeTypes: ["application/pdf", "application/x-pdf", "application/octet-stream"]
    },
    {
        extension: ".txt",
        label: "TXT",
        mimeTypes: ["text/plain", "application/octet-stream"]
    },
    {
        extension: ".md",
        label: "Markdown",
        mimeTypes: ["text/markdown", "text/plain", "application/octet-stream"]
    },
    {
        extension: ".markdown",
        label: "Markdown",
        mimeTypes: ["text/markdown", "text/plain", "application/octet-stream"]
    }
];

function getSupportedUploadType(fileName, mimeType) {
    const normalizedName = fileName.toLowerCase();
    const normalizedMime = mimeType.toLowerCase();
    return supportedUploadTypes.find((type) => (
        normalizedName.endsWith(type.extension) && type.mimeTypes.includes(normalizedMime)
    ));
}

function supportedFormatsLabel() {
    return "PDF, TXT, and Markdown";
}

function getTenantId(req) {
    return req.user.tenantId;
}

async function handleUploadRequest(req, res, next) {
    try {
        const parsed = requestUploadSchema.parse(req.body);
        const uploadType = getSupportedUploadType(parsed.fileName, parsed.mimeType);
        if (!uploadType) {
            return res.status(400).json({ error: `Only ${supportedFormatsLabel()} files are supported.` });
        }
        if (parsed.fileSize > env.MAX_UPLOAD_BYTES) {
            return res.status(413).json({
                error: `File exceeds the ${Math.floor(env.MAX_UPLOAD_BYTES / 1024 / 1024)} MB upload limit.`
            });
        }
        const sanitizedFileName = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const requestedFilename = `${Date.now()}-${crypto.randomUUID()}-${sanitizedFileName}`;
        const tenantId = getTenantId(req);
        const filePath = `tenants/${tenantId}/${requestedFilename}`;

        const signed = await createSignedUploadUrl(filePath);

        res.status(200).json({
            filePath,
            token: signed.token,
            signedUrl: signed.signedUrl,
            mimeType: parsed.mimeType,
            fileType: uploadType.label
        });
    } catch (error) {
        next(error);
    }
}

router.post("/upload-url", requireAuth, handleUploadRequest);

router.post("/upload-complete", requireAuth, async (req, res, next) => {
    try {
        const parsed = uploadCompleteSchema.parse(req.body);
        const tenantId = getTenantId(req);
        const expectedPrefix = `tenants/${tenantId}/`;
        if (!parsed.filePath.startsWith(expectedPrefix)) {
            return res.status(403).json({ error: "Document path does not belong to this workspace" });
        }
        const uploadType = getSupportedUploadType(parsed.fileName, parsed.mimeType);
        if (!uploadType) {
            return res.status(400).json({ error: `Only ${supportedFormatsLabel()} files are supported.` });
        }

        const response = await queueDocumentProcessing({
            userId: tenantId,
            filePath: parsed.filePath,
            documentId: parsed.documentId,
            displayName: parsed.fileName,
            mimeType: parsed.mimeType,
            fileType: uploadType.label
        });

        documentOperations.inc({ operation: "queue", result: "success" });
        res.status(200).json({
            message: "Document queued for AI processing.",
            messageId: response.messageId
        });
    } catch (error) {
        documentOperations.inc({ operation: "queue", result: "error" });
        next(error);
    }
});

router.get("/", requireAuth, async (req, res, next) => {
    try {
        const limit = Number.parseInt(req.query.limit || "50", 10);
        const data = await getDocumentStatuses(getTenantId(req), Number.isNaN(limit) ? 50 : limit);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
});

router.delete("/:documentId", requireAuth, async (req, res, next) => {
    try {
        const documentId = z.string().uuid().parse(req.params.documentId);
        const result = await deleteDocumentData(getTenantId(req), documentId);
        documentOperations.inc({ operation: "delete", result: "success" });
        res.status(200).json(result);
    } catch (error) {
        documentOperations.inc({ operation: "delete", result: "error" });
        if (error.response?.status === 404) {
            return res.status(404).json({ error: "Document not found" });
        }
        next(error);
    }
});

export default router;
