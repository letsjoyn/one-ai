import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
    use: {
        baseURL: "http://127.0.0.1:4174",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ],
    webServer: [
        {
            command: "node e2e/mock-gateway.mjs",
            port: 8089,
            reuseExistingServer: !process.env.CI
        },
        {
            command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174",
            url: "http://127.0.0.1:4174",
            env: {
                VITE_GATEWAY_URL: "http://127.0.0.1:8089"
            },
            reuseExistingServer: !process.env.CI
        }
    ]
});
