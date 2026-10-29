import { useState, type FormEvent } from "react";
import { api } from "../api/client";

const PENDO_AGENT_ID = "gQSZYv-RbNWeMAC7KnGXD0v8At4";

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Chat panel backed by /api/assistant (LLM-backed in full Taskly stack). */
export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const prompt: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: input };
    const next = [...messages, prompt];
    setMessages(next);
    setInput("");
    setPending(true);
    window.pendo?.trackAgent?.("prompt", {
      agentId: PENDO_AGENT_ID,
      conversationId,
      messageId: prompt.id,
      content: prompt.content,
      suggestedPrompt: false,
      fileUploaded: false,
    });
    try {
      const reply = await api.post<{ reply: string }>("/api/assistant", {
        messages: next.map(({ role, content }) => ({ role, content })),
      });
      const response: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply.reply,
      };
      setMessages([...next, response]);
      window.pendo?.trackAgent?.("agent_response", {
        agentId: PENDO_AGENT_ID,
        conversationId,
        messageId: response.id,
        content: response.content,
      });
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <button
        id="assistant-open"
        className="assistant-fab"
        type="button"
        onClick={() => setOpen(true)}
      >
        Ask Brightdesk AI
      </button>
    );
  }

  return (
    <aside className="assistant-panel">
      <header>
        <h2>Brightdesk AI</h2>
        <button id="assistant-close" type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </header>
      <ul className="assistant-messages">
        {messages.map((message) => (
          <li key={message.id} className={`message message-${message.role}`}>
            {message.content}
          </li>
        ))}
      </ul>
      <form onSubmit={(event) => void send(event)}>
        <input
          id="assistant-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about tickets"
        />
        <button id="assistant-submit" type="submit" disabled={pending}>
          Send
        </button>
      </form>
    </aside>
  );
}
