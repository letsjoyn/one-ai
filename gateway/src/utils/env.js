import { z } from "zod";

const trimString = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1)
);

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
    JWT_SECRET: trimString,
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: trimString,
    SUPABASE_BUCKET: z.string().default("documents"),
    QSTASH_TOKEN: trimString,
    QSTASH_TARGET_URL: z.string().url(),
    AI_WORKER_URL: z.string().url(),
    ALLOW_UNAUTHENTICATED: z.string().default("true"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().default(120)
}));

const parsed = rawEnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
