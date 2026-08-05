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
        }
    },
    { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
