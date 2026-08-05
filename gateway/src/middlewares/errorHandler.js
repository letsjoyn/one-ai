import { env } from "../utils/env.js";

export function errorHandler(err, req, res, _next) {
    req.log?.error({ err }, "Gateway request failed");
    if (err.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }

    if (err.status) {
        const message = env.NODE_ENV === "production" && err.status >= 500
            ? "Internal server error"
            : err.message || "Request failed";
        return res.status(err.status).json({ error: message });
    }

    if (err.message === "Missing user identity") {
        return res.status(401).json({ error: "Missing user identity" });
    }

    const message = env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error";
    res.status(500).json({ error: message });
}
