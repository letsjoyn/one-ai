import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;

export async function connectDB() {
    if (isConnected && mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    await mongoose.connect(env.MONGO_URI, {
        dbName: "omniquery"
    });

    isConnected = true;
    return mongoose.connection;
}
