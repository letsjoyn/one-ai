import jwt from "jsonwebtoken";
import { env } from "../utils/env.js";

export function requireAuth(req, _res, next) {
    const header = req.header("authorization") || req.header("Authorization");

    if (!header || !header.startsWith("Bearer ")) {
        const error = new Error("Missing or invalid Authorization header");
        error.status = 401;
        return next(error);
    }

    const token = header.slice(7).trim();

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            role: decoded.role
        };
        return next();
    } catch (error) {
        const authError = new Error("Invalid or expired token");
        authError.status = 401;
        return next(authError);
    }
}
