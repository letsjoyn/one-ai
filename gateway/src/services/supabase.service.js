import { createClient } from "@supabase/supabase-js";
import { env } from "../utils/env.js";

function timeoutFetch(resource, options = {}) {
    const controller = new AbortController();
    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => controller.abort(new Error("Supabase request timed out")), timeoutMs);

    const mergedSignal = options.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal;

    return fetch(resource, {
        ...options,
        signal: mergedSignal
    }).finally(() => {
        clearTimeout(timeoutId);
    });
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
        fetch: timeoutFetch
    }
});

export async function createSignedUploadUrl(filePath) {
    const { data, error } = await supabase.storage
        .from(env.SUPABASE_BUCKET)
        .createSignedUploadUrl(filePath);

    if (error) {
        throw new Error(`Supabase signed URL failed: ${error.message}`);
    }

    return data;
}

export async function createSignedDownloadUrl(filePath, expiresIn = 60 * 60) {
    const { data, error } = await supabase.storage
        .from(env.SUPABASE_BUCKET)
        .createSignedUrl(filePath, expiresIn);

    if (error) {
        throw new Error(`Supabase download URL failed: ${error.message}`);
    }

    return data;
}
