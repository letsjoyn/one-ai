import ChatBox from "../components/ChatBox";
import ConversationSidebar from "../components/ConversationSidebar";

function ChatPage() {
    return (
        <div className="grid h-full min-h-[75vh] grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
            <ConversationSidebar />
            <ChatBox />
        </div>
    );
}

export default ChatPage;
