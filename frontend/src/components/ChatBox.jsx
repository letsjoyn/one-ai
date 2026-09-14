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
    return String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="mono rounded bg-subtle px-1 py-0.5 text-[11px]">{p.slice(1, -1)}</code>;
        return p;
    });
}

function parseTable(tableLines) {
    const parseRow = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
    const headers = parseRow(tableLines[0]);
    const rows = tableLines.slice(2).map(parseRow);
    return (
        <div className="my-3 overflow-x-auto rounded border border-line">
            <table className="w-full border-collapse text-[12px]">
                <thead>
                    <tr className="border-b border-line bg-subtle">
                        {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary whitespace-nowrap">
                                {renderInline(h)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((row, ri) => (
                        <tr key={ri} className="transition-colors hover:bg-subtle/50">
                            {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-2 text-[12px] leading-5 align-top">
                                    {renderInline(cell)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderMarkdown(text) {
    const blocks = [];
    const lines = String(text).split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Fenced code block
        if (trimmed.startsWith("```")) {
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            blocks.push(
                <pre key={`code-${i}`} className="my-3 overflow-x-auto rounded border border-line bg-subtle px-4 py-3">
                    <code className="mono text-[12px] leading-5 text-primary">{codeLines.join("\n")}</code>
                </pre>
            );
            i++;
            continue;
        }

        // Table
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) {
                tableLines.push(lines[i]);
                i++;
            }
            if (tableLines.length >= 2) {
                blocks.push(<div key={`table-${i}`}>{parseTable(tableLines)}</div>);
            }
            continue;
        }

        // Headings
        const h3 = trimmed.match(/^###\s+(.+)$/);
        const h2 = trimmed.match(/^##\s+(.+)$/);
        const h1 = trimmed.match(/^#\s+(.+)$/);
        if (h3) { blocks.push(<p key={`h3-${i}`} className="mt-4 mb-1 text-[13px] font-semibold">{renderInline(h3[1])}</p>); i++; continue; }
        if (h2) { blocks.push(<p key={`h2-${i}`} className="mt-5 mb-1.5 text-[14px] font-semibold tracking-tight">{renderInline(h2[1])}</p>); i++; continue; }
        if (h1) { blocks.push(<p key={`h1-${i}`} className="mt-5 mb-1.5 text-[15px] font-semibold tracking-tight">{renderInline(h1[1])}</p>); i++; continue; }

        // Horizontal rule
        if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
            blocks.push(<hr key={`hr-${i}`} className="my-3 border-line" />);
            i++; continue;
        }

        // Bullet list — collect consecutive items
        if (/^[-*]\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
                i++;
            }
            blocks.push(
                <ul key={`ul-${i}`} className="my-2 space-y-1 pl-5 text-[13px] leading-6">
                    {items.map((item, j) => <li key={j} className="list-disc">{renderInline(item)}</li>)}
                </ul>
            );
            continue;
        }

        // Ordered list
        if (/^\d+[.)]\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
                i++;
            }
            blocks.push(
                <ol key={`ol-${i}`} className="my-2 space-y-1 pl-5 text-[13px] leading-6">
                    {items.map((item, j) => <li key={j} className="list-decimal">{renderInline(item)}</li>)}
                </ol>
            );
            continue;
        }

        // Empty line
        if (!trimmed) { blocks.push(<div key={`sp-${i}`} className="h-2" />); i++; continue; }

        // Paragraph
        blocks.push(<p key={`p-${i}`} className="mb-1.5 text-[13px] leading-6">{renderInline(trimmed)}</p>);
        i++;
    }

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
