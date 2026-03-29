"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat-panel";

export function MobileNav() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Mobile: Solo il pulsante chat flottante */}
      <div className="md:hidden">
        {!chatOpen && (
          <Button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl z-50 p-0"
            size="icon"
          >
            <MessageSquare size={24} />
          </Button>
        )}

        {chatOpen && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col">
            <ChatPanel onClose={() => setChatOpen(false)} fullscreen />
          </div>
        )}
      </div>
    </>
  );
}
