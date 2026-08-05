import { env } from "../utils/env.js";

function createRateLimiter({ windowMs, max, scope, includePath }) {
    const buckets = new Map();
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of buckets.entries()) {
            if (now > bucket.resetAt) {
                buckets.delete(key);
            }
        }
    }, Math.max(windowMs, 30000));
    cleanupTimer.unref();

    return function limitRequests(req, res, next) {
        const pathPart = includePath ? `:${req.path}` : "";
        const key = `${scope}:${req.ip}${pathPart}`;
        const now = Date.now();
        const current = buckets.get(key);

        if (!current || now > current.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (current.count >= max) {
            const retryAfter = Math.ceil((current.resetAt - now) / 1000);
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
        }

        current.count += 1;
        buckets.set(key, current);
        return next();
    };
}

export const rateLimit = createRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    scope: "api",
    includePath: true
});

export const authRateLimit = createRateLimiter({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    scope: "auth",
    includePath: false
});
