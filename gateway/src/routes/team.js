import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";

import { requireAuth } from "../middlewares/requireAuth.js";
import { requireWorkspaceAdmin } from "../middlewares/requireWorkspaceAdmin.js";
import { authRateLimit } from "../middlewares/rateLimit.js";
import { Invitation } from "../models/Invitation.js";
import { User } from "../models/User.js";
import {
    createOpaqueToken,
    hashToken,
    serializeUser,
    signToken
} from "../services/auth.service.js";
import { sendInvitationEmail } from "../services/email.service.js";
import { connectDB } from "../utils/db.js";

const router = express.Router();

const inviteSchema = z.object({
    email: z.string().trim().email().max(254),
    role: z.enum(["admin", "member"]).default("member")
});

const roleSchema = z.object({
    role: z.enum(["admin", "member"])
});

const acceptSchema = z.object({
    token: z.string().min(20).max(500),
    password: z.string().min(8).max(128)
});

function serializeInvitation(invitation) {
    return {
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
    };
}

router.post("/accept-invite", authRateLimit, async (req, res, next) => {
    try {
        await connectDB();
        const parsed = acceptSchema.parse(req.body);
        const invitation = await Invitation.findOne({
            tokenHash: hashToken(parsed.token),
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (!invitation) {
            return res.status(400).json({ error: "Invitation is invalid or expired" });
        }

        let user = await User.findOne({ email: invitation.email });
        if (user) {
            const passwordMatch = await bcrypt.compare(parsed.password, user.passwordHash);
            if (!passwordMatch) {
                return res.status(401).json({ error: "Invalid account password" });
            }

            if (user.tenantId !== invitation.tenantId && user.role === "admin") {
                const adminCount = await User.countDocuments({
                    tenantId: user.tenantId,
                    role: "admin"
                });
                if (adminCount <= 1) {
                    return res.status(409).json({
                        error: "Promote another administrator in your current workspace before joining this one"
                    });
                }
            }

            user.tenantId = invitation.tenantId;
            user.role = invitation.role;
            user.emailVerifiedAt ||= new Date();
            await user.save();
        } else {
            const passwordHash = await bcrypt.hash(parsed.password, 12);
            user = await User.create({
                email: invitation.email,
                passwordHash,
                tenantId: invitation.tenantId,
                role: invitation.role,
                emailVerifiedAt: new Date()
            });
        }

        invitation.status = "accepted";
        invitation.acceptedAt = new Date();
        await invitation.save();

        return res.status(200).json({
            token: signToken(user),
            user: serializeUser(user)
        });
    } catch (error) {
        next(error);
    }
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
    try {
        await connectDB();
        const [members, invitations] = await Promise.all([
            User.find({ tenantId: req.user.tenantId }).sort({ role: 1, email: 1 }),
            Invitation.find({
                tenantId: req.user.tenantId,
                status: "pending",
                expiresAt: { $gt: new Date() }
            }).sort({ createdAt: -1 })
        ]);

        return res.status(200).json({
            members: members.map(serializeUser),
            invitations: invitations.map(serializeInvitation)
        });
    } catch (error) {
        next(error);
    }
});

router.post("/invitations", requireWorkspaceAdmin, async (req, res, next) => {
    try {
        const parsed = inviteSchema.parse(req.body);
        const email = parsed.email.toLowerCase();
        const existingMember = await User.findOne({
            tenantId: req.user.tenantId,
            email
        });
        if (existingMember) {
            return res.status(409).json({ error: "This user is already a workspace member" });
        }

        await Invitation.updateMany(
            {
                tenantId: req.user.tenantId,
                email,
                status: "pending"
            },
            { $set: { status: "revoked" } }
        );

        const token = createOpaqueToken();
        const invitation = await Invitation.create({
            tenantId: req.user.tenantId,
            email,
            role: parsed.role,
            invitedBy: req.currentUser._id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await sendInvitationEmail(email, token, req.currentUser.email);
        return res.status(201).json({ invitation: serializeInvitation(invitation) });
    } catch (error) {
        next(error);
    }
});

router.delete(
    "/invitations/:invitationId",
    requireWorkspaceAdmin,
    async (req, res, next) => {
        try {
            if (!mongoose.isValidObjectId(req.params.invitationId)) {
                return res.status(404).json({ error: "Invitation not found" });
            }

            const invitation = await Invitation.findOneAndUpdate(
                {
                    _id: req.params.invitationId,
                    tenantId: req.user.tenantId,
                    status: "pending"
                },
                { $set: { status: "revoked" } },
                { new: true }
            );
            if (!invitation) {
                return res.status(404).json({ error: "Invitation not found" });
            }
            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
);

router.patch("/members/:userId", requireWorkspaceAdmin, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(404).json({ error: "Member not found" });
        }
        if (req.params.userId === req.user.userId) {
            return res.status(400).json({ error: "Another administrator must change your role" });
        }

        const parsed = roleSchema.parse(req.body);
        const member = await User.findOne({
            _id: req.params.userId,
            tenantId: req.user.tenantId
        });
        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        if (member.role === "admin" && parsed.role === "member") {
            const adminCount = await User.countDocuments({
                tenantId: req.user.tenantId,
                role: "admin"
            });
            if (adminCount <= 1) {
                return res.status(409).json({
                    error: "A workspace must keep at least one administrator"
                });
            }
        }

        member.role = parsed.role;
        await member.save();
        return res.status(200).json({ member: serializeUser(member) });
    } catch (error) {
        next(error);
    }
});

router.delete("/members/:userId", requireWorkspaceAdmin, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) {
            return res.status(404).json({ error: "Member not found" });
        }
        if (req.params.userId === req.user.userId) {
            return res.status(400).json({ error: "You cannot remove your own account" });
        }

        const member = await User.findOne({
            _id: req.params.userId,
            tenantId: req.user.tenantId
        });
        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        member.tenantId = globalThis.crypto.randomUUID();
        member.role = "admin";
        await member.save();
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;
