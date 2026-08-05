import { MessageSquare, Plus, Trash2 } from "lucide-react";

function formatUpdatedAt(value) {
    const date = new Date(value);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationSidebar({ conversations, activeId, onSelect, onCreate, onDelete }) {
    return (
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-line bg-subtle/40 lg:border-b-0 lg:border-r">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <div>
                    <p className="text-sm font-semibold">Conversations</p>
                    <p className="text-[11px] text-secondary">Saved to your account</p>
                </div>
                <button
                    type="button"
                    className="icon-button"
                    onClick={onCreate}
                    aria-label="New conversation"
                    title="New conversation"
                >
                    <Plus size={17} />
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:flex-1 lg:space-y-1 lg:overflow-y-auto">
                {conversations.map((conversation) => {
                    const isActive = conversation.id === activeId;
                    return (
                        <div
                            key={conversation.id}
                            className={`group flex min-w-[220px] items-center border-l-2 lg:min-w-0 ${
                                isActive ? "border-accent bg-surface" : "border-transparent hover:bg-surface"
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelect(conversation.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                            >
                                <MessageSquare size={16} className="shrink-0 text-secondary" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-medium">{conversation.title}</span>
                                    <span className="mt-1 block text-[11px] text-secondary">
                                        {conversation.messages.length} messages - {formatUpdatedAt(conversation.updatedAt)}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(conversation.id)}
                                className="mr-2 grid h-7 w-7 shrink-0 place-items-center text-secondary opacity-100 transition hover:bg-subtle hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100"
                                aria-label={`Delete ${conversation.title}`}
                                title="Delete conversation"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}

export default ConversationSidebar;
