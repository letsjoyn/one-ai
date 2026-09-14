import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChatBox from "../components/ChatBox";
import ConversationSidebar from "../components/ConversationSidebar";
import { createConversation, fetchConversations, removeConversation } from "../api/conversations";

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const active = useMemo(
        () => conversations.find((c) => c.id === activeId) || conversations[0],
        [activeId, conversations]
    );

    async function addConversation() {
        try {
            const next = await createConversation();
            setConversations((c) => [next, ...c]);
            setActiveId(next.id);
            setError("");
        } catch { setError("Could not create a conversation."); }
    }

    function replaceConversation(next) {
        setConversations((cs) => cs.map((c) => (c.id === next.id ? next : c)));
    }

    async function deleteConversation(id) {
        if (!window.confirm("Delete this conversation permanently?")) return;
        try {
            await removeConversation(id);
            const rest = conversations.filter((c) => c.id !== id);
            if (!rest.length) {
                const fresh = await createConversation();
                setConversations([fresh]);
                setActiveId(fresh.id);
            } else {
                setConversations(rest);
                if (activeId === id) setActiveId(rest[0].id);
            }
            setError("");
        } catch { setError("Could not delete the conversation."); }
    }

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                let items = await fetchConversations();
                if (!items.length) items = [await createConversation()];
                if (!cancelled) { setConversations(items); setActiveId(items[0].id); setError(""); }
            } catch {
                if (!cancelled) setError("Could not load conversations. Check the gateway connection.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <p className="eyebrow mb-2">Research assistant</p>
                <h1 className="text-[1.6rem] font-semibold tracking-tight">Chat</h1>
                <p className="mt-1.5 text-[13px] text-secondary">
                    Ask questions — answers cite the source passages they were drawn from.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2.5 rounded border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle size={13} className="shrink-0" />
                    {error}
                </div>
            )}

            <div className="card overflow-hidden lg:h-[calc(100vh-13rem)] lg:min-h-[580px] grid min-h-[600px] lg:grid-cols-[220px_minmax(0,1fr)]">
                <ConversationSidebar
                    conversations={conversations}
                    activeId={active?.id}
                    onSelect={setActiveId}
                    onCreate={addConversation}
                    onDelete={deleteConversation}
                />
                {active ? (
                    <ChatBox key={active.id} conversation={active} onReplace={replaceConversation} />
                ) : (
                    <div className="grid place-items-center p-6 text-[12px] text-secondary">
                        {loading ? "Loading…" : "No conversation selected"}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatPage;
