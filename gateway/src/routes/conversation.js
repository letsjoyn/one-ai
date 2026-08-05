import express from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { requireAuth } from "../middlewares/requireAuth.js";
import { Conversation } from "../models/Conversation.js";
import { serializeConversation } from "../services/conversation.service.js";
import { connectDB } from "../utils/db.js";

const router = express.Router();

const createSchema = z.object({
    title: z.string().trim().min(1).max(120).default("New conversation")
});

const updateSchema = z.object({
    title: z.string().trim().min(1).max(120)
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
    try {
        await connectDB();
        const conversations = await Conversation.find({
            tenantId: req.user.tenantId,
            userId: req.user.userId
        })
            .sort({ updatedAt: -1 })
            .limit(100);

        return res.status(200).json({
            conversations: conversations.map(serializeConversation)
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/", async (req, res, next) => {
    try {
        await connectDB();
        const parsed = createSchema.parse(req.body || {});
        const conversation = await Conversation.create({
            tenantId: req.user.tenantId,
            userId: req.user.userId,
            title: parsed.title
        });

        return res.status(201).json({ conversation: serializeConversation(conversation) });
    } catch (error) {
        return next(error);
    }
});

router.patch("/:conversationId", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.conversationId)) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        await connectDB();
        const parsed = updateSchema.parse(req.body);
        const conversation = await Conversation.findOneAndUpdate(
            {
                _id: req.params.conversationId,
                tenantId: req.user.tenantId,
                userId: req.user.userId
            },
            { $set: { title: parsed.title } },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        return res.status(200).json({ conversation: serializeConversation(conversation) });
    } catch (error) {
        return next(error);
    }
});

router.delete("/:conversationId", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.conversationId)) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        await connectDB();
        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.conversationId,
            tenantId: req.user.tenantId,
            userId: req.user.userId
        });

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

export default router;
