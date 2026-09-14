import dns from "node:dns";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(resolve("gateway/package.json"));
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Load gateway .env
const envPath = resolve("gateway/.env");
if (!existsSync(envPath)) {
    console.error("gateway/.env not found.");
    process.exit(1);
}

const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) {
        env[match[1]] = match[2];
    }
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.log("Usage: node scripts/reset-password.mjs <email> <newPassword>");
    console.log("Example: node scripts/reset-password.mjs joynnayvedya@gmail.com Password123!");
    process.exit(1);
}

if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exit(1);
}

if (env.DNS_SERVERS) {
    dns.setServers(env.DNS_SERVERS.split(",").map(s => s.trim()).filter(Boolean));
}

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(env.MONGO_URI, {
            dbName: env.MONGO_DB || "omniquery",
            serverSelectionTimeoutMS: 5000
        });

        const usersCol = mongoose.connection.db.collection("users");
        const user = await usersCol.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.error(`User with email "${email}" not found.`);
            const allUsers = await usersCol.find({}, { projection: { email: 1 } }).toArray();
            console.log("Existing users in database:");
            allUsers.forEach(u => console.log(" - " + u.email));
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await usersCol.updateOne(
            { _id: user._id },
            {
                $set: {
                    passwordHash,
                    emailVerifiedAt: new Date()
                }
            }
        );

        console.log(`\n✅ Password successfully updated for: ${user.email}`);
        console.log(`You can now sign in at http://127.0.0.1:5173 with your new password.`);
        process.exit(0);
    } catch (err) {
        console.error("Error updating password:", err.message);
        process.exit(1);
    }
}

run();
