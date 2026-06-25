import express from "express";
import { z } from "zod";
import { queryRag } from "../services/aiworker.service.js";

const router = express.Router();

const chatSchema = z.object({
    query: z.string().min(1),
    conversationId: z.string().optional(),
    topK: z.number().int().min(1).max(10).default(4)
});

function getTenantId(req) {
    return req.user?.tenantId || `tenant-${req.userId || "demo-user"}`;
}

router.post("/chat", async (req, res, next) => {
    try {
        const parsed = chatSchema.parse(req.body);

        const result = await queryRag({
            userId: getTenantId(req),
            query: parsed.query,
            conversationId: parsed.conversationId,
            topK: parsed.topK
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
