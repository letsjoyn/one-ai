import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:8089";
const authToken = __ENV.AUTH_TOKEN || "";
const chatConversationId = __ENV.CHAT_CONVERSATION_ID || "";
const chatQuery = __ENV.CHAT_QUERY || "What does the document say?";

export const options = {
    vus: Number(__ENV.VUS || 10),
    duration: __ENV.DURATION || "15s",
    thresholds: {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<750"],
        checks: ["rate>0.99"]
    }
};

export default function () {
    const health = http.get(`${baseUrl}/api/health`);
    check(health, {
        "health returns 200": (response) => response.status === 200,
        "health response is JSON": (response) => response.headers["Content-Type"]?.includes("application/json")
    });

    if (authToken) {
        const headers = {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json"
        };
        const response = http.get(`${baseUrl}/api/documents`, {
            headers
        });
        check(response, {
            "documents returns 200": (result) => result.status === 200
        });

        if (chatConversationId) {
            const chat = http.post(
                `${baseUrl}/api/chat`,
                JSON.stringify({
                    query: chatQuery,
                    conversationId: chatConversationId
                }),
                {
                    headers
                }
            );
            check(chat, {
                "chat returns 200": (result) => result.status === 200,
                "chat returns an answer": (result) => Boolean(result.json("answer"))
            });
        }
    }

    sleep(0.2);
}
