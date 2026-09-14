import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        tenantId: {
            type: String,
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member"
        },
        emailVerifiedAt: {
            type: Date,
            default: null
        },
        // Incremented on password reset / "sign out everywhere".
        // Stored in JWTs; if the DB value is higher, the token is revoked.
        tokenVersion: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
