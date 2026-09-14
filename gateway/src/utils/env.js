import { z } from "zod";

const trimString = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1)
);

const optionalString = z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? undefined : value),
    z.string().min(1).optional()
);

const booleanValue = z.preprocess((value) => {
    if (typeof value === "string") {
        return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    }
    return value;
}, z.boolean());

const rawEnvSchema = z.preprocess((value) => {
    if (!value || typeof value !== "object") {
        return value;
    }

    const envObject = { ...value };
    if (!envObject.QSTASH_TARGET_URL && envObject.QSTASH_URL) {
        envObject.QSTASH_TARGET_URL = envObject.QSTASH_URL;
    }

    return envObject;
}, z.object({
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
    MONGO_URI: trimString,
    MONGO_DB: z.string().default("omniquery"),
    DNS_SERVERS: optionalString,
    JWT_SECRET: trimString,
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: trimString,
    SUPABASE_BUCKET: z.string().default("documents"),
    QSTASH_TOKEN: trimString,
    QSTASH_TARGET_URL: z.string().url(),
    AI_WORKER_URL: z.string().url(),
    INTERNAL_API_KEY: z.string().default("local-development-only"),
    METRICS_API_KEY: z.string().default("local-metrics-only"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    APP_BASE_URL: z.string().url().default("http://localhost:5173"),
    REQUIRE_EMAIL_VERIFICATION: booleanValue.default(false),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: booleanValue.default(false),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    EMAIL_FROM: optionalString,
    MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20)
}).superRefine((value, context) => {
    if (value.NODE_ENV !== "production") {
        return;
    }

    if (value.JWT_SECRET.length < 32) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["JWT_SECRET"],
            message: "JWT_SECRET must be at least 32 characters in production"
        });
    }

    if (value.INTERNAL_API_KEY.length < 32 || value.INTERNAL_API_KEY === "local-development-only") {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["INTERNAL_API_KEY"],
            message: "INTERNAL_API_KEY must be at least 32 characters in production"
        });
    }

    if (value.METRICS_API_KEY.length < 32 || value.METRICS_API_KEY === "local-metrics-only") {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["METRICS_API_KEY"],
            message: "METRICS_API_KEY must be at least 32 characters in production"
        });
    }

    if (value.REQUIRE_EMAIL_VERIFICATION) {
        for (const key of ["SMTP_HOST", "EMAIL_FROM"]) {
            if (!value[key]) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [key],
                    message: `${key} is required in production when REQUIRE_EMAIL_VERIFICATION is enabled`
                });
            }
        }
    }

    if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASS)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["SMTP_USER"],
            message: "SMTP_USER and SMTP_PASS must be configured together"
        });
    }
}));

const parsed = rawEnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
