import crypto from "crypto";
import jwt from "jsonwebtoken";

import { ActionToken } from "../models/ActionToken.js";
import { env } from "../utils/env.js";

export function signToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            tenantId: user.tenantId,
            role: user.role,
            email: user.email,
            tv: user.tokenVersion ?? 0  // token version — used to revoke JWTs on password reset
        },
        env.JWT_SECRET,
        {
            algorithm: "HS256",
            audience: "omniquery-frontend",
            issuer: "omniquery-gateway",
            expiresIn: "7d"
        }
    );
}

export function serializeUser(user) {
    return {
        userId: user._id.toString(),
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt)
    };
}

export function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken() {
    return crypto.randomBytes(32).toString("base64url");
}

export async function createActionToken(userId, type, ttlMinutes) {
    await ActionToken.deleteMany({ userId, type });
    const token = createOpaqueToken();
    await ActionToken.create({
        userId,
        type,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000)
    });
    return token;
}
