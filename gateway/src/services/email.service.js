import nodemailer from "nodemailer";

import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

let transporter;

function getTransporter() {
    if (!env.SMTP_HOST) {
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: env.SMTP_USER
                ? {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS
                }
                : undefined
        });
    }
    return transporter;
}

async function sendEmail({ to, subject, text, html, developmentUrl }) {
    const mailer = getTransporter();
    if (!mailer) {
        if (env.NODE_ENV === "production") {
            throw new Error("Email service is not configured");
        }
        logger.warn({ to, developmentUrl }, `[development email] ${subject}`);
        return;
    }

    await mailer.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html
    });
}

export async function sendVerificationEmail(email, token) {
    const url = `${env.APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await sendEmail({
        to: email,
        subject: "Verify your OmniQuery email",
        text: `Verify your email to activate OmniQuery: ${url}`,
        html: `<p>Verify your email to activate OmniQuery.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
        developmentUrl: url
    });
}

export async function sendPasswordResetEmail(email, token) {
    const url = `${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail({
        to: email,
        subject: "Reset your OmniQuery password",
        text: `Reset your OmniQuery password: ${url}`,
        html: `<p>A password reset was requested for your OmniQuery account.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
        developmentUrl: url
    });
}

export async function sendInvitationEmail(email, token, inviterEmail) {
    const url = `${env.APP_BASE_URL}/accept-invite?token=${encodeURIComponent(token)}`;
    await sendEmail({
        to: email,
        subject: "Join an OmniQuery workspace",
        text: `${inviterEmail} invited you to an OmniQuery workspace: ${url}`,
        html: `<p>${inviterEmail} invited you to an OmniQuery workspace.</p><p><a href="${url}">Accept invitation</a></p><p>This link expires in 7 days.</p>`,
        developmentUrl: url
    });
}
