import express from "express";
import crypto from "crypto";

import { metricsContentType, metricsPayload } from "../monitoring/metrics.js";
import { env } from "../utils/env.js";

const router = express.Router();

router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "gateway" });
});

router.get("/metrics", async (req, res) => {
    const provided = req.header("x-metrics-api-key") || "";
    const expected = env.METRICS_API_KEY;
    const valid = provided.length === expected.length
        && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!valid) {
        return res.status(401).json({ error: "Invalid metrics API key" });
    }

    res.setHeader("Content-Type", metricsContentType);
    return res.status(200).send(await metricsPayload());
});

export default router;
