import { MessageSquare, Plus, Trash2 } from "lucide-react";

function fmt(value) {
    const d = new Date(value);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationSidebar({ conversations, activeId, onSelect, onCreate, onDelete }) {
    return (
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-line bg-surface lg:border-b-0 lg:border-r">
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
                <p className="text-[12px] font-semibold">Conversations</p>
                <button
                    type="button"
                    onClick={onCreate}
                    aria-label="New conversation"
                    title="New conversation"
                    className="icon-button h-7 w-7 border-0 text-secondary hover:bg-subtle hover:text-primary"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* List */}
            <div className="flex gap-1.5 overflow-x-auto p-2 lg:block lg:flex-1 lg:space-y-0.5 lg:overflow-y-auto">
                {conversations.map((conv) => {
                    const active = conv.id === activeId;
                    return (
                        <div
                            key={conv.id}
                            className={`group flex min-w-[210px] items-center rounded lg:min-w-0 transition-colors ${
                                active ? "bg-subtle" : "hover:bg-subtle"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelect(conv.id)}
                                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                            >
                                <MessageSquare
                                    size={13}
                                    className={`shrink-0 ${active ? "text-accent" : "text-secondary"}`}
                                    strokeWidth={active ? 2.2 : 1.8}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className={`block truncate text-[12px] font-medium leading-tight ${active ? "text-primary" : "text-secondary"}`}>
                                        {conv.title}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-secondary tabular-nums">
                                        {conv.messages.length} msg · {fmt(conv.updatedAt)}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(conv.id)}
                                className="mr-1.5 grid h-6 w-6 shrink-0 place-items-center rounded text-secondary opacity-0 transition-all hover:bg-red-50 hover:text-[rgb(var(--danger))] dark:hover:bg-red-950/30 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                aria-label={`Delete ${conv.title}`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}

export default ConversationSidebar;
