import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChatBox from "../components/ChatBox";
import ConversationSidebar from "../components/ConversationSidebar";
import {
    createConversation,
    fetchConversations,
    removeConversation
} from "../api/conversations";

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const activeConversation = useMemo(
        () => conversations.find((conversation) => conversation.id === activeId) || conversations[0],
        [activeId, conversations]
    );

    async function addConversation() {
        try {
            const nextConversation = await createConversation();
            setConversations((current) => [nextConversation, ...current]);
            setActiveId(nextConversation.id);
            setError("");
        } catch {
            setError("Could not create a conversation.");
        }
    }

    function replaceConversation(nextConversation) {
        setConversations((current) => current.map((conversation) => {
            return conversation.id === nextConversation.id ? nextConversation : conversation;
        }));
    }

    async function deleteConversation(conversationId) {
        if (!window.confirm("Delete this conversation permanently?")) {
            return;
        }

        try {
            await removeConversation(conversationId);
            const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
            if (!remaining.length) {
                const replacement = await createConversation();
                setConversations([replacement]);
                setActiveId(replacement.id);
            } else {
                setConversations(remaining);
                if (activeId === conversationId) {
                    setActiveId(remaining[0].id);
                }
            }
            setError("");
        } catch {
            setError("Could not delete the conversation.");
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                let items = await fetchConversations();
                if (!items.length) {
                    items = [await createConversation()];
                }
                if (!cancelled) {
                    setConversations(items);
                    setActiveId(items[0].id);
                    setError("");
                }
            } catch {
                if (!cancelled) {
                    setError("Could not load conversations. Check the gateway connection.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-5">
            <div>
                <p className="eyebrow">Research assistant</p>
                <h1 className="mt-2 text-2xl font-semibold">Ask your documents</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                    Questions are answered from indexed content and include the retrieved source passages.
                </p>
            </div>

            <div className="grid min-h-[680px] min-w-0 overflow-hidden border border-line bg-surface lg:h-[calc(100vh-13rem)] lg:min-h-[620px] lg:grid-cols-[270px_minmax(0,1fr)]">
                <ConversationSidebar
                    conversations={conversations}
                    activeId={activeConversation?.id}
                    onSelect={setActiveId}
                    onCreate={addConversation}
                    onDelete={deleteConversation}
                />
                {activeConversation && (
                    <ChatBox
                        key={activeConversation.id}
                        conversation={activeConversation}
                        onReplace={replaceConversation}
                    />
                )}
                {!activeConversation && (
                    <div className="grid min-h-[420px] place-items-center p-6 text-sm text-secondary">
                        {loading ? "Loading conversations..." : "No conversation selected"}
                    </div>
                )}
            </div>
            {error && (
                <div className="flex items-start gap-2 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <AlertCircle className="mt-0.5 shrink-0" size={14} />
                    {error}
                </div>
            )}
        </div>
    );
}

export default ChatPage;
