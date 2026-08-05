import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({
    register,
    prefix: "omniquery_gateway_"
});

const httpRequests = new client.Counter({
    name: "omniquery_gateway_http_requests_total",
    help: "Total gateway HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [register]
});

const httpDuration = new client.Histogram({
    name: "omniquery_gateway_http_request_duration_seconds",
    help: "Gateway HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 120],
    registers: [register]
});

export const chatRequests = new client.Counter({
    name: "omniquery_gateway_chat_requests_total",
    help: "Total chat requests handled by the gateway",
    labelNames: ["result"],
    registers: [register]
});

export const chatDuration = new client.Histogram({
    name: "omniquery_gateway_chat_duration_seconds",
    help: "End-to-end gateway chat duration in seconds",
    labelNames: ["result"],
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
    registers: [register]
});

export const documentOperations = new client.Counter({
    name: "omniquery_gateway_document_operations_total",
    help: "Document operations handled by the gateway",
    labelNames: ["operation", "result"],
    registers: [register]
});

function routeLabel(req) {
    if (req.route?.path) {
        return `${req.baseUrl || ""}${req.route.path}`;
    }
    return "unmatched";
}

export function metricsMiddleware(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const elapsedSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        const labels = {
            method: req.method,
            route: routeLabel(req),
            status: String(res.statusCode)
        };
        httpRequests.inc(labels);
        httpDuration.observe(labels, elapsedSeconds);
    });

    next();
}

export async function metricsPayload() {
    return register.metrics();
}

export const metricsContentType = register.contentType;
