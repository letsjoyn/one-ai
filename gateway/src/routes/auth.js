import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../utils/env.js";
import { connectDB } from "../utils/db.js";
import { User } from "../models/User.js";

const router = express.Router();

const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

function signToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            tenantId: user.tenantId,
            role: user.role
        },
        env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

router.post("/register", async (req, res, next) => {
    try {
        await connectDB();
        const parsed = authSchema.parse(req.body);
        const email = parsed.email.toLowerCase();

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: "Email already registered" });
        }

        const passwordHash = await bcrypt.hash(parsed.password, 12);
        const user = await User.create({
            email,
            passwordHash,
            tenantId: crypto.randomUUID(),
            role: "member"
        });

        const token = signToken(user);

        return res.status(201).json({
            token,
            user: {
                userId: user._id.toString(),
                email: user.email,
                tenantId: user.tenantId,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        await connectDB();
        const parsed = authSchema.parse(req.body);
        const email = parsed.email.toLowerCase();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(parsed.password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = signToken(user);

        return res.status(200).json({
            token,
            user: {
                userId: user._id.toString(),
                email: user.email,
                tenantId: user.tenantId,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
