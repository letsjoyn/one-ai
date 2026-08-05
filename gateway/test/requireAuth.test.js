import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.MONGO_URI ||= "mongodb://localhost:27017/omniquery-test";
process.env.JWT_SECRET ||= "test-jwt-secret-that-is-long-enough-for-local-tests";
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.QSTASH_TOKEN ||= "test-qstash-token";
process.env.QSTASH_TARGET_URL ||= "http://localhost:8000/api/process-webhook";
process.env.AI_WORKER_URL ||= "http://localhost:8000";
process.env.INTERNAL_API_KEY ||= "test-internal-api-key";

const { requireAuth } = await import("../src/middlewares/requireAuth.js");

function runMiddleware(authorization, resolvedUser) {
    const req = {
        app: {
            locals: {
                resolveAuthenticatedUser: async (decoded) => ({
                    _id: { toString: () => decoded.userId },
                    tenantId: resolvedUser?.tenantId || decoded.tenantId,
                    role: resolvedUser?.role || decoded.role
                })
            }
        },
        header(name) {
            if (name.toLowerCase() === "authorization") {
                return authorization;
            }
            return undefined;
        }
    };

    return new Promise((resolve) => {
        requireAuth(req, {}, (error) => resolve({ error, req }));
    });
}

test("rejects requests without a bearer token", async () => {
    const { error } = await runMiddleware(undefined);
    assert.equal(error.status, 401);
});

test("rejects invalid tokens", async () => {
    const { error } = await runMiddleware("Bearer invalid-token");
    assert.equal(error.status, 401);
});

test("loads tenant claims from a valid token", async () => {
    const token = jwt.sign(
        {
            userId: "user-1",
            tenantId: "tenant-1",
            role: "member"
        },
        process.env.JWT_SECRET,
        {
            algorithm: "HS256",
            audience: "omniquery-frontend",
            issuer: "omniquery-gateway"
        }
    );

    const { error, req } = await runMiddleware(`Bearer ${token}`);
    assert.equal(error, undefined);
    assert.deepEqual(req.user, {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "member"
    });
});

test("uses the current database workspace instead of stale token claims", async () => {
    const token = jwt.sign(
        {
            userId: "user-1",
            tenantId: "old-tenant",
            role: "admin"
        },
        process.env.JWT_SECRET,
        {
            algorithm: "HS256",
            audience: "omniquery-frontend",
            issuer: "omniquery-gateway"
        }
    );

    const { error, req } = await runMiddleware(`Bearer ${token}`, {
        tenantId: "new-tenant",
        role: "member"
    });

    assert.equal(error, undefined);
    assert.equal(req.user.tenantId, "new-tenant");
    assert.equal(req.user.role, "member");
});
