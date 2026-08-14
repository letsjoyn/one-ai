import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
    {
        tenantId: {
            type: String,
            required: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member"
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "revoked", "declined"],
            default: "pending"
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        },
        acceptedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

invitationSchema.index({ tenantId: 1, email: 1, status: 1 });

export const Invitation = mongoose.models.Invitation
    || mongoose.model("Invitation", invitationSchema);
