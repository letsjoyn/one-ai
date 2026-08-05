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
process.env.METRICS_API_KEY ||= "test-metrics-api-key";

const {
    createOpaqueToken,
    hashToken,
    serializeUser,
    signToken
} = await import("../src/services/auth.service.js");

const user = {
    _id: { toString: () => "507f1f77bcf86cd799439011" },
    email: "engineer@example.com",
    tenantId: "workspace-1",
    role: "admin",
    emailVerifiedAt: new Date()
};

test("opaque tokens are random and hash deterministically", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    assert.notEqual(first, second);
    assert.equal(hashToken(first), hashToken(first));
    assert.notEqual(hashToken(first), first);
});

test("signed session contains the scoped workspace claims", () => {
    const token = signToken(user);
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
        audience: "omniquery-frontend",
        issuer: "omniquery-gateway"
    });

    assert.equal(payload.userId, user._id.toString());
    assert.equal(payload.tenantId, user.tenantId);
    assert.equal(payload.role, "admin");
    assert.equal(payload.email, user.email);
});

test("serialized users expose verification state without password data", () => {
    assert.deepEqual(serializeUser(user), {
        userId: user._id.toString(),
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        emailVerified: true
    });
});
