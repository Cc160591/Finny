import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Chat AI</h1>
        <p className="text-muted-foreground mt-1">
          Parla con Finny: crea transazioni, controlla i tuoi saldi, imposta budget.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}
