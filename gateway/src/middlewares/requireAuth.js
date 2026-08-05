import jwt from "jsonwebtoken";
import { env } from "../utils/env.js";
import { User } from "../models/User.js";
import { connectDB } from "../utils/db.js";

async function resolveAuthenticatedUser(decoded) {
    await connectDB();
    return User.findById(decoded.userId);
}

export async function requireAuth(req, _res, next) {
    const header = req.header("authorization") || req.header("Authorization");

    if (!header || !header.startsWith("Bearer ")) {
        const error = new Error("Missing or invalid Authorization header");
        error.status = 401;
        return next(error);
    }

    const token = header.slice(7).trim();

    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ["HS256"],
            audience: "omniquery-frontend",
            issuer: "omniquery-gateway"
        });
    } catch {
        const authError = new Error("Invalid or expired token");
        authError.status = 401;
        return next(authError);
    }

    try {
        const resolver = req.app?.locals?.resolveAuthenticatedUser
            || resolveAuthenticatedUser;
        const user = await resolver(decoded);
        if (!user) {
            const error = new Error("User account no longer exists");
            error.status = 401;
            return next(error);
        }

        req.user = {
            userId: user._id.toString(),
            tenantId: user.tenantId,
            role: user.role
        };
        req.authUser = user;
        return next();
    } catch (error) {
        return next(error);
    }
}
