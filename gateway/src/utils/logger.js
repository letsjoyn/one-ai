import pino from "pino";

import { env } from "./env.js";

export const logger = pino({
    level: env.LOG_LEVEL,
    base: {
        service: "gateway",
        environment: env.NODE_ENV
    },
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "password",
            "token",
            "*.password",
            "*.token"
        ],
        censor: "[redacted]"
    }
});
