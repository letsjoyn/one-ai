import { BookOpen, FileSearch, SendHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";
import { askQuestion } from "../api/chat";
import SourceAccordion from "./SourceAccordion";

const promptIdeas = [
    "Summarize the key points",
    "List important dates and obligations",
    "What information is missing?"
];

function ChatBox({ conversation, onReplace }) {
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [optimisticMessages, setOptimisticMessages] = useState(conversation.messages);

    async function sendMessage(overrideQuery) {
        const query = (overrideQuery ?? input).trim();
        if (!query || busy) {
            return;
        }

        setBusy(true);
        setInput("");
        setOptimisticMessages((messages) => [...messages, { role: "user", text: query }]);

        try {
            const response = await askQuestion(query, conversation.id);
            setOptimisticMessages(response.conversation.messages);
            onReplace(response.conversation);
        } catch (error) {
            console.error(error);
            setOptimisticMessages((messages) => [
                ...messages,
                {
                    role: "assistant",
                    text: "The assistant is unavailable. Verify that the gateway and AI worker are running.",
                    sources: [],
                    error: true
                }
            ]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-5">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{conversation.title}</p>
                    <p className="text-[11px] text-secondary">Retrieval-augmented response</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-secondary">
                    <span className="h-2 w-2 bg-emerald-500" />
                    Ready
                </div>
            </div>

            <div className="min-h-0 overflow-y-auto">
                {!optimisticMessages.length ? (
                    <div className="flex min-h-full items-center justify-center px-5 py-12">
                        <div className="w-full max-w-xl text-center">
                            <span className="mx-auto grid h-12 w-12 place-items-center border border-line bg-subtle text-secondary">
                                <FileSearch size={22} />
                            </span>
                            <h2 className="mt-5 text-lg font-semibold">Start with a focused question</h2>
                            <p className="mx-auto mt-2 max-w-md break-words text-sm leading-6 text-secondary">
                                OmniQuery retrieves matching passages from your indexed PDFs before generating an answer.
                            </p>
                            <div className="mt-7 grid gap-2 sm:grid-cols-3">
                                {promptIdeas.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        onClick={() => sendMessage(prompt)}
                                        className="min-h-20 min-w-0 break-words border border-line bg-surface px-3 py-3 text-left text-xs leading-5 text-secondary transition hover:border-accent hover:text-primary"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto w-full max-w-3xl divide-y divide-line px-4 sm:px-6">
                        {optimisticMessages.map((message, index) => (
                            <article key={message.id || `${message.role}-${index}`} className="flex gap-4 py-6">
                                <span
                                    className={`grid h-8 w-8 shrink-0 place-items-center border ${
                                        message.role === "user"
                                            ? "border-primary bg-primary text-surface"
                                            : "border-line bg-subtle text-secondary"
                                    }`}
                                >
                                    {message.role === "user" ? <BookOpen size={15} /> : <Sparkles size={15} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="mb-2 text-xs font-semibold text-secondary">
                                        {message.role === "user" ? "You" : "OmniQuery"}
                                    </p>
                                    <p className={`whitespace-pre-wrap text-sm leading-7 ${message.error ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
                                        {message.text}
                                    </p>
                                    {message.role === "assistant" && <SourceAccordion sources={message.sources} />}
                                </div>
                            </article>
                        ))}
                        {busy && (
                            <article className="flex gap-4 py-6">
                                <span className="grid h-8 w-8 shrink-0 place-items-center border border-line bg-subtle text-secondary">
                                    <Sparkles size={15} />
                                </span>
                                <div className="flex items-center gap-2 text-sm text-secondary">
                                    <span className="h-1.5 w-1.5 animate-pulse bg-accent" />
                                    Searching indexed documents...
                                </div>
                            </article>
                        )}
                    </div>
                )}
            </div>

            <div className="border-t border-line bg-subtle/40 p-3 sm:p-4">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                sendMessage();
                            }
                        }}
                        className="field min-h-11 max-h-36 flex-1 resize-y py-3"
                        placeholder="Ask a question about your documents"
                        aria-label="Chat message"
                    />
                    <button
                        type="button"
                        onClick={() => sendMessage()}
                        disabled={busy || !input.trim()}
                        className="button-primary h-11 w-11 px-0"
                        aria-label="Send message"
                        title="Send message"
                    >
                        <SendHorizontal size={17} />
                    </button>
                </div>
                <p className="mx-auto mt-2 max-w-3xl text-[11px] text-secondary">
                    Answers may be incomplete. Verify important details in the cited sources.
                </p>
            </div>
        </section>
    );
}

export default ChatBox;
