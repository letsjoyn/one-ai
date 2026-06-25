import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./utils/env.js";
import { connectDB } from "./utils/db.js";
import { requestContext } from "./middlewares/requestContext.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { rateLimit } from "./middlewares/rateLimit.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/document.js";
import chatRoutes from "./routes/chat.js";

const app = express();
app.disable("x-powered-by");

app.use(helmet());
app.use(
    cors({
        origin: env.FRONTEND_ORIGIN,
        credentials: true
    })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit);
app.use(requestContext);

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api", chatRoutes);

app.use(errorHandler);

async function start() {
    await connectDB();
    app.listen(env.PORT, () => {
        console.log(`Gateway running on port ${env.PORT}`);
    });
}

start().catch((error) => {
    console.error("Failed to start gateway", error);
    process.exit(1);
});
