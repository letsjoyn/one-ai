function ConversationSidebar() {
    const seedConversations = [
        "Invoice policy Q&A",
        "Onboarding handbook",
        "Contract risk review"
    ];

    return (
        <aside className="rounded-xl border border-slate-200 bg-white/70 p-3">
            <p className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">History</p>
            <div className="space-y-2">
                {seedConversations.map((title) => (
                    <button
                        key={title}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-tide"
                    >
                        {title}
                    </button>
                ))}
            </div>
        </aside>
    );
}

export default ConversationSidebar;
