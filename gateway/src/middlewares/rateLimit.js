import { env } from "../utils/env.js";

const buckets = new Map();

export function rateLimit(req, res, next) {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const windowMs = env.RATE_LIMIT_WINDOW_MS;
    const max = env.RATE_LIMIT_MAX;

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
}
