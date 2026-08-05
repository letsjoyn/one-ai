import mongoose from "mongoose";

const actionTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ["email_verification", "password_reset"],
            required: true
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        }
    },
    { timestamps: true }
);

actionTokenSchema.index({ userId: 1, type: 1 });

export const ActionToken = mongoose.models.ActionToken
    || mongoose.model("ActionToken", actionTokenSchema);
