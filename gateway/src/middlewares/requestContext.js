import { env } from "../utils/env.js";

export function requestContext(req, _res, next) {
    const userId = req.header("x-user-id") || req.body?.userId || req.query?.userId;
    if (!userId && env.ALLOW_UNAUTHENTICATED === "false") {
        return next(new Error("Missing user identity"));
    }
    const resolvedUserId = userId || "demo-user";
    req.userId = resolvedUserId;
    req.user = {
        userId: resolvedUserId,
        tenantId: `tenant-${resolvedUserId}`,
        role: "member"
    };
    next();
}
