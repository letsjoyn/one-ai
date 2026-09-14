import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../utils/env.js";
import { connectDB } from "../utils/db.js";
import { ActionToken } from "../models/ActionToken.js";
import { User } from "../models/User.js";
import {
    createActionToken,
    hashToken,
    serializeUser,
    signToken
} from "../services/auth.service.js";
import {
    sendPasswordResetEmail,
    sendVerificationEmail
} from "../services/email.service.js";
import { authRateLimit } from "../middlewares/rateLimit.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const registerSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128)
});

const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128)
});


const emailSchema = z.object({
    email: z.string().trim().email().max(254)
});

const tokenSchema = z.object({
    token: z.string().min(20).max(500)
});

const resetSchema = tokenSchema.extend({
    password: z.string().min(12).max(128)
});

router.post("/register", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = registerSchema.parse(req.body);
        const email = parsed.email.toLowerCase();

        const existing = await User.findOne({ email });
        if (existing) {
            // Return the same response as success to prevent email enumeration.
            // If email verification is required the attacker learns nothing useful;
            // if it is not required, we still avoid confirming account existence.
            if (env.REQUIRE_EMAIL_VERIFICATION) {
                return res.status(202).json({
                    requiresVerification: true,
                    message: "If this address is new, a verification email has been sent."
                });
            }
            return res.status(202).json({
                message: "If this address is new, your account has been created."
            });
        }

        const passwordHash = await bcrypt.hash(parsed.password, 12);
        const user = await User.create({
            email,
            passwordHash,
            tenantId: globalThis.crypto.randomUUID(),
            role: "admin",
            emailVerifiedAt: env.REQUIRE_EMAIL_VERIFICATION ? null : new Date()
        });

        if (env.REQUIRE_EMAIL_VERIFICATION) {
            const verificationToken = await createActionToken(
                user._id,
                "email_verification",
                24 * 60
            );
            await sendVerificationEmail(user.email, verificationToken);
            return res.status(202).json({
                requiresVerification: true,
                message: "If this address is new, a verification email has been sent."
            });
        }

        const token = signToken(user);
        return res.status(201).json({
            token,
            user: serializeUser(user)
        });
    } catch (error) {
        if (error?.code === 11000) {
            // Race condition on unique index — treat the same as duplicate email.
            return res.status(202).json({
                requiresVerification: env.REQUIRE_EMAIL_VERIFICATION,
                message: env.REQUIRE_EMAIL_VERIFICATION
                    ? "If this address is new, a verification email has been sent."
                    : "If this address is new, your account has been created."
            });
        }
        next(error);
    }
});

router.post("/login", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = loginSchema.parse(req.body);
        const email = parsed.email.toLowerCase();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(parsed.password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt) {
            return res.status(403).json({
                error: "Verify your email before signing in",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        const token = signToken(user);

        return res.status(200).json({
            token,
            user: serializeUser(user)
        });
    } catch (error) {
        next(error);
    }
});

router.post("/verify-email", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = tokenSchema.parse(req.body);
        const actionToken = await ActionToken.findOneAndDelete({
            tokenHash: hashToken(parsed.token),
            type: "email_verification",
            expiresAt: { $gt: new Date() }
        });

        if (!actionToken) {
            return res.status(400).json({ error: "Verification link is invalid or expired" });
        }

        const user = await User.findByIdAndUpdate(
            actionToken.userId,
            { $set: { emailVerifiedAt: new Date() } },
            { new: true }
        );
        if (!user) {
            return res.status(400).json({ error: "Verification link is invalid or expired" });
        }

        return res.status(200).json({ message: "Email verified. You can now sign in." });
    } catch (error) {
        next(error);
    }
});

router.post("/resend-verification", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = emailSchema.parse(req.body);
        const user = await User.findOne({ email: parsed.email.toLowerCase() });

        if (user && !user.emailVerifiedAt) {
            const verificationToken = await createActionToken(
                user._id,
                "email_verification",
                24 * 60
            );
            try {
                await sendVerificationEmail(user.email, verificationToken);
            } catch (error) {
                logger.error({ err: error }, "Failed to resend verification email");
            }
        }

        return res.status(202).json({
            message: "If the account needs verification, a new link has been sent."
        });
    } catch (error) {
        next(error);
    }
});

router.post("/forgot-password", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = emailSchema.parse(req.body);
        const user = await User.findOne({ email: parsed.email.toLowerCase() });

        if (user) {
            const resetToken = await createActionToken(user._id, "password_reset", 30);
            try {
                await sendPasswordResetEmail(user.email, resetToken);
            } catch (error) {
                logger.error({ err: error }, "Failed to send password reset email");
            }
        }

        return res.status(202).json({
            message: "If an account exists, a password reset link has been sent."
        });
    } catch (error) {
        next(error);
    }
});

router.post("/reset-password", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = resetSchema.parse(req.body);
        const actionToken = await ActionToken.findOneAndDelete({
            tokenHash: hashToken(parsed.token),
            type: "password_reset",
            expiresAt: { $gt: new Date() }
        });

        if (!actionToken) {
            return res.status(400).json({ error: "Password reset link is invalid or expired" });
        }

        const passwordHash = await bcrypt.hash(parsed.password, 12);
        await User.findByIdAndUpdate(actionToken.userId, {
            $set: { passwordHash },
            $inc: { tokenVersion: 1 }  // revoke all existing JWTs immediately
        });
        await ActionToken.deleteMany({
            userId: actionToken.userId,
            type: "password_reset"
        });

        return res.status(200).json({ message: "Password updated. You can now sign in." });
    } catch (error) {
        next(error);
    }
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        return res.status(200).json({ user: serializeUser(req.authUser) });
    } catch (error) {
        next(error);
    }
});

export default router;
