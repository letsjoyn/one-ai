import { SendHorizontal } from "lucide-react";
import { useState } from "react";
import { askQuestion } from "../api/chat";
import SourceAccordion from "./SourceAccordion";

function ChatBox() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [busy, setBusy] = useState(false);

    async function sendMessage() {
        const query = input.trim();
        if (!query || busy) {
            return;
        }

        setBusy(true);
        setMessages((prev) => [...prev, { role: "user", text: query }]);
        setInput("");

        try {
            const response = await askQuestion(query);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: response.answer,
                    sources: response.sources || []
                }
            ]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: "The assistant is unavailable. Verify gateway and ai-worker are running.",
                    sources: []
                }
            ]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid h-full grid-rows-[1fr_auto] gap-3">
            <div className="space-y-4 overflow-auto rounded-xl border border-slate-200 bg-white/70 p-4">
                {!messages.length && (
                    <div className="rounded-xl border border-dashed border-tide/40 bg-skywash p-4 text-sm text-slate-600">
                        Ask a question about your uploaded PDFs.
                    </div>
                )}
                {messages.map((message, index) => (
                    <div
                        key={`${message.role}-${index}`}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === "user"
                                ? "ml-auto bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-800"
                            }`}
                    >
                        <p className="whitespace-pre-wrap">{message.text}</p>
                        {message.role === "assistant" && <SourceAccordion sources={message.sources} />}
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        className="min-h-14 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-tide"
                        placeholder="Ask OmniQuery..."
                    />
                    <button
                        onClick={sendMessage}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        Send <SendHorizontal size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatBox;
