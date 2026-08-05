import { Client } from "@upstash/qstash";
import axios from "axios";
import { env } from "../utils/env.js";
import { logger } from "../utils/logger.js";

function getQstashToken() {
    const token = env.QSTASH_TOKEN;

    if (!token || !token.trim()) {
        throw new Error("QSTASH_TOKEN is missing or empty");
    }

    return token.trim();
}

function createQstashClient() {
    return new Client({ token: getQstashToken() });
}

function isLoopbackTarget(targetUrl) {
    try {
        const url = new URL(targetUrl);
        return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    } catch {
        return false;
    }
}

export async function queueDocumentProcessing(payload) {
    if (isLoopbackTarget(env.QSTASH_TARGET_URL)) {
        logger.info("QStash target is loopback; using direct local POST fallback");
        const response = await axios.post(env.QSTASH_TARGET_URL, payload, {
            headers: {
                "Content-Type": "application/json",
                "x-local-webhook-bypass": "true"
            },
            timeout: 300000
        });

        return {
            messageId: `local-${Date.now()}`,
            data: response.data
        };
    }

    const qstash = createQstashClient();
    const response = await qstash.publishJSON({
        url: env.QSTASH_TARGET_URL,
        body: payload,
        retries: 5,
        timeout: 300
    });

    return response;
}
