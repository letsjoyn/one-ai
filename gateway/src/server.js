import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import pinoHttp from "pino-http";
import { env } from "./utils/env.js";
import { connectDB } from "./utils/db.js";
import { logger } from "./utils/logger.js";
import { metricsMiddleware } from "./monitoring/metrics.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { rateLimit } from "./middlewares/rateLimit.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/document.js";
import chatRoutes from "./routes/chat.js";
import conversationRoutes from "./routes/conversation.js";
import teamRoutes from "./routes/team.js";

const app = express();
app.disable("x-powered-by");
if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

app.use(helmet());
app.use(
    cors({
        origin: env.FRONTEND_ORIGIN,
        credentials: true
    })
);
app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({
    logger,
    genReqId(req, res) {
        const requestId = req.headers["x-request-id"] || crypto.randomUUID();
        res.setHeader("X-Request-ID", requestId);
        return requestId;
    },
    customLogLevel(_req, res, error) {
        if (error || res.statusCode >= 500) {
            return "error";
        }
        if (res.statusCode >= 400) {
            return "warn";
        }
        return "info";
    }
}));
app.use(metricsMiddleware);
app.use(rateLimit);

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/team", teamRoutes);
app.use("/api", chatRoutes);

app.use(errorHandler);

async function start() {
    await connectDB();
    app.listen(env.PORT, () => {
        logger.info({ port: env.PORT }, "Gateway running");
    });
}

start().catch((error) => {
    logger.fatal({ err: error }, "Failed to start gateway");
    process.exit(1);
});
