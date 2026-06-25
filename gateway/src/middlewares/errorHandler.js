export function errorHandler(err, _req, res, _next) {
    console.error(err);
    if (err.name === "ZodError") {
        return res.status(400).json({ error: "Invalid request body", details: err.issues });
    }

    if (err.status) {
        return res.status(err.status).json({ error: err.message || "Request failed" });
    }

    if (err.message === "Missing user identity") {
        return res.status(401).json({ error: "Missing user identity" });
    }

    res.status(500).json({ error: err.message || "Internal server error" });
}
