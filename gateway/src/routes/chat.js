import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { queryRag } from "../services/aiworker.service.js";
import { serializeConversation } from "../services/conversation.service.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { Conversation } from "../models/Conversation.js";
import { connectDB } from "../utils/db.js";
import { chatDuration, chatRequests } from "../monitoring/metrics.js";

const router = express.Router();

const chatSchema = z.object({
    query: z.string().trim().min(1).max(5000),
    conversationId: z.string().max(100).optional(),
    topK: z.number().int().min(1).max(10).default(4)
});

function getTenantId(req) {
    return req.user.tenantId;
}

router.post("/chat", requireAuth, async (req, res, next) => {
    let conversation;
    const stopTimer = chatDuration.startTimer();
    try {
        const parsed = chatSchema.parse(req.body);
        await connectDB();

        if (parsed.conversationId && !mongoose.isValidObjectId(parsed.conversationId)) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        if (parsed.conversationId) {
            conversation = await Conversation.findOne({
                _id: parsed.conversationId,
                tenantId: req.user.tenantId,
                userId: req.user.userId
            });
            if (!conversation) {
                return res.status(404).json({ error: "Conversation not found" });
            }
        } else {
            conversation = new Conversation({
                tenantId: req.user.tenantId,
                userId: req.user.userId
            });
        }

        if (!conversation.messages.length) {
            conversation.title = parsed.query.slice(0, 120);
        }
        conversation.messages.push({
            role: "user",
            text: parsed.query
        });
        conversation.messages = conversation.messages.slice(-200);
        await conversation.save();

        const result = await queryRag({
            userId: getTenantId(req),
            query: parsed.query,
            conversationId: conversation._id.toString(),
            topK: parsed.topK
        });

        conversation.messages.push({
            role: "assistant",
            text: result.answer,
            sources: result.sources || []
        });
        conversation.messages = conversation.messages.slice(-200);
        await conversation.save();

        chatRequests.inc({ result: "success" });
        stopTimer({ result: "success" });
        res.status(200).json({
            ...result,
            conversation: serializeConversation(conversation)
        });
    } catch (error) {
        chatRequests.inc({ result: "error" });
        stopTimer({ result: "error" });
        if (conversation?._id) {
            try {
                conversation.messages.push({
                    role: "assistant",
                    text: "The assistant could not complete this request. Please try again.",
                    sources: [],
                    error: true
                });
                conversation.messages = conversation.messages.slice(-200);
                await conversation.save();
            } catch {
                // Preserve the original request error.
            }
        }
        next(error);
    }
});

export default router;
