import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../utils/env.js";
import { createSignedUploadUrl } from "../services/supabase.service.js";
import { queueDocumentProcessing } from "../services/qstash.service.js";
import { getDocumentStatuses } from "../services/aiworker.service.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

const requestUploadSchema = z.object({
    fileName: z.string().min(1),
    mimeType: z.string().default("application/pdf")
});

const uploadCompleteSchema = z.object({
    filePath: z.string().min(1),
    documentId: z.string().min(1)
});

function getTenantId(req) {
    return req.user?.tenantId || `tenant-${req.userId || "demo-user"}`;
}

async function handleUploadRequest(req, res, next) {
    try {
        const parsed = requestUploadSchema.parse(req.body);
        if (!parsed.mimeType.includes("pdf") && !parsed.fileName.toLowerCase().endsWith(".pdf")) {
            return res.status(400).json({ error: "Only PDF files are supported." });
        }
        const sanitizedFileName = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const requestedFilename = `${Date.now()}-${crypto.randomUUID()}-${sanitizedFileName}`;
        const tenantId = getTenantId(req);
        const filePath = `tenants/${tenantId}/${requestedFilename}`;

        const signed = await createSignedUploadUrl(filePath);

        res.status(200).json({
            filePath,
            token: signed.token,
            signedUrl: `${env.SUPABASE_URL}/storage/v1/object/upload/sign/${env.SUPABASE_BUCKET}/${signed.path}?token=${signed.token}`,
            mimeType: parsed.mimeType
        });
    } catch (error) {
        next(error);
    }
}

router.post("/upload-url", requireAuth, handleUploadRequest);

router.post("/request-upload", handleUploadRequest);

router.post("/upload-complete", async (req, res, next) => {
    try {
        const parsed = uploadCompleteSchema.parse(req.body);
        const tenantId = getTenantId(req);

        const response = await queueDocumentProcessing({
            userId: tenantId,
            filePath: parsed.filePath,
            documentId: parsed.documentId
        });

        res.status(200).json({
            message: "Document queued for AI processing.",
            messageId: response.messageId
        });
    } catch (error) {
        next(error);
    }
});

router.get("/", async (req, res, next) => {
    try {
        const limit = Number.parseInt(req.query.limit || "50", 10);
        const data = await getDocumentStatuses(getTenantId(req), Number.isNaN(limit) ? 50 : limit);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
});

export default router;
