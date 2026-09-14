import { ArrowUp, BookOpen, CircleDot, FileSearch, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { askQuestion } from "../api/chat";
import SourceAccordion from "./SourceAccordion";

const PROMPTS = [
    "Summarize the key points",
    "List important dates and obligations",
    "What information is missing?"
];

function renderInline(text) {
    return String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return p;
    });
}

function renderMarkdown(text) {
    const blocks = [], lines = String(text).split(/\r?\n/);
    let ul = [], ol = [];
    function flush() {
        if (ul.length) { blocks.push(<ul key={`ul${blocks.length}`} className="my-2 list-disc space-y-1 pl-5 text-[13px]">{ul.map((t, i) => <li key={i}>{renderInline(t)}</li>)}</ul>); ul = []; }
        if (ol.length) { blocks.push(<ol key={`ol${blocks.length}`} className="my-2 list-decimal space-y-1 pl-5 text-[13px]">{ol.map((t, i) => <li key={i}>{renderInline(t)}</li>)}</ol>); ol = []; }
    }
    lines.forEach((line, i) => {
        const t = line.trim();
        const bm = t.match(/^[-*]\s+(.+)$/), om = t.match(/^\d+[.)]\s+(.+)$/);
        if (!t) { flush(); blocks.push(<div key={`s${i}`} className="h-2" />); return; }
        if (bm) { if (ol.length) flush(); ul.push(bm[1]); return; }
        if (om) { if (ul.length) flush(); ol.push(om[1]); return; }
        flush();
        blocks.push(<p key={`p${i}`} className="mb-2 text-[13px] leading-6 last:mb-0">{renderInline(t)}</p>);
    });
    flush();
    return blocks;
}

function ChatBox({ conversation, onReplace }) {
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [messages, setMessages] = useState(conversation.messages);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, busy]);

    async function send(override) {
        const q = (override ?? input).trim();
        if (!q || busy) return;
        setBusy(true);
        setInput("");
        setMessages((m) => [...m, { role: "user", text: q }]);
        try {
            const res = await askQuestion(q, conversation.id);
            setMessages(res.conversation.messages);
            onReplace(res.conversation);
        } catch {
            setMessages((m) => [...m, {
                role: "assistant",
                text: "The assistant is unavailable. Verify that the gateway and AI worker are running.",
                sources: [],
                error: true
            }]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto]">
            {/* Chat header */}
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-tight">{conversation.title}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-secondary">
                    <CircleDot size={10} className="text-[rgb(var(--success))]" />
                    Ready
                </div>
            </div>

            {/* Messages */}
            <div className="min-h-0 overflow-y-auto">
                {!messages.length ? (
                    <div className="flex min-h-full items-center justify-center px-5 py-12">
                        <div className="w-full max-w-lg text-center">
                            <span className="mx-auto grid h-10 w-10 place-items-center rounded border border-line bg-subtle text-secondary">
                                <FileSearch size={18} />
                            </span>
                            <h2 className="mt-5 text-[15px] font-semibold tracking-tight">Ask your documents</h2>
                            <p className="mx-auto mt-2 max-w-xs text-[12px] leading-5 text-secondary">
                                OmniQuery retrieves matching passages from your indexed files before generating an answer.
                            </p>
                            <div className="mt-6 grid gap-2 sm:grid-cols-3">
                                {PROMPTS.map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => send(p)}
                                        className="rounded border border-line bg-surface px-3 py-3 text-left text-[12px] leading-5 text-secondary transition-colors hover:border-accent/50 hover:bg-subtle hover:text-primary"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6 divide-y divide-line">
                        {messages.map((msg, idx) => (
                            <article key={msg.id || `${msg.role}-${idx}`} className="flex gap-3 py-5">
                                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded border text-[11px] font-semibold ${
                                    msg.role === "user"
                                        ? "border-[rgb(var(--text-primary))] bg-[rgb(var(--text-primary))] text-[rgb(var(--surface))]"
                                        : "border-line bg-subtle text-secondary"
                                }`}>
                                    {msg.role === "user" ? <BookOpen size={13} /> : <Sparkles size={13} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                                        {msg.role === "user" ? "You" : "OmniQuery"}
                                    </p>
                                    <div className={msg.error ? "text-[rgb(var(--danger))] text-[13px]" : ""}>
                                        {msg.role === "assistant" && !msg.error
                                            ? renderMarkdown(msg.text)
                                            : <p className="text-[13px] leading-6">{msg.text}</p>
                                        }
                                    </div>
                                    {msg.role === "assistant" && <SourceAccordion sources={msg.sources} />}
                                </div>
                            </article>
                        ))}

                        {/* Thinking indicator */}
                        {busy && (
                            <article className="flex gap-3 py-5">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-subtle text-secondary">
                                    <Sparkles size={13} />
                                </span>
                                <div className="flex items-center gap-2 text-[12px] text-secondary">
                                    <span className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <span
                                                key={i}
                                                className="h-1.5 w-1.5 rounded-full bg-current opacity-60"
                                                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                                            />
                                        ))}
                                    </span>
                                    Searching documents…
                                </div>
                            </article>
                        )}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-line bg-surface p-3 sm:p-4">
                <div className="mx-auto flex max-w-2xl items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                        }}
                        className="field min-h-[40px] max-h-32 flex-1 resize-none py-2.5"
                        placeholder="Ask a question about your documents…"
                        rows={1}
                        aria-label="Message"
                    />
                    <button
                        type="button"
                        onClick={() => send()}
                        disabled={busy || !input.trim()}
                        className="button-primary h-10 w-10 shrink-0 px-0 rounded"
                        aria-label="Send"
                    >
                        <ArrowUp size={16} />
                    </button>
                </div>
                <p className="mx-auto mt-2 max-w-2xl text-[11px] text-secondary">
                    Verify important details in the cited sources.
                </p>
            </div>
        </section>
    );
}

export default ChatBox;
