import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;
let dnsConfigured = false;

function configureDnsServers() {
    if (dnsConfigured || !env.DNS_SERVERS) {
        return;
    }

    const servers = env.DNS_SERVERS
        .split(",")
        .map((server) => server.trim())
        .filter(Boolean);

    if (servers.length > 0) {
        dns.setServers(servers);
    }
    dnsConfigured = true;
}

export async function connectDB() {
    configureDnsServers();

    if (isConnected && mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    await mongoose.connect(env.MONGO_URI, {
        dbName: env.MONGO_DB,
        serverSelectionTimeoutMS: 10000
    });

    isConnected = true;
    return mongoose.connection;
}
