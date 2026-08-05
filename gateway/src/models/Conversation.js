import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
    {
        sourcePath: String,
        chunk: mongoose.Schema.Types.Mixed,
        documentId: String,
        snippet: String
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true
        },
        text: {
            type: String,
            required: true,
            maxlength: 50000
        },
        sources: {
            type: [sourceSchema],
            default: []
        },
        error: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

const conversationSchema = new mongoose.Schema(
    {
        tenantId: {
            type: String,
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        title: {
            type: String,
            trim: true,
            maxlength: 120,
            default: "New conversation"
        },
        messages: {
            type: [messageSchema],
            default: []
        }
    },
    { timestamps: true }
);

conversationSchema.index({ tenantId: 1, userId: 1, updatedAt: -1 });

export const Conversation = mongoose.models.Conversation
    || mongoose.model("Conversation", conversationSchema);
