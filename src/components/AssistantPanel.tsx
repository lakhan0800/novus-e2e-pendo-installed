import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

/** Chat panel backed by /api/assistant (LLM-backed in full Taskly stack). */
export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [pending, setPending] = useState(false);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input }];
    // Only counts and lengths are sent to Pendo — never prompt/reply text (may contain PII).
    const promptLength = input.length;
    setMessages(next);
    setInput("");
    setPending(true);
    const startedAt = performance.now();
    try {
      const reply = await api.post<{ reply: string }>("/api/assistant", { messages: next });
      setMessages([...next, { role: "assistant", content: reply.reply }]);
      // Pendo Track Event: the assistant answered and the reply was added to the conversation.
      window.pendo?.track("assistant_response_received", {
        success: true,
        conversationTurnCount: next.length,
        promptLength,
        replyLength: reply.reply.length,
        responseTimeMs: Math.round(performance.now() - startedAt),
      });
    } catch (err) {
      // Pendo Track Event: the assistant request failed (HTTP error or network failure).
      window.pendo?.track("assistant_response_received", {
        success: false,
        conversationTurnCount: next.length,
        promptLength,
        responseTimeMs: Math.round(performance.now() - startedAt),
        errorStatus: err instanceof ApiError ? err.status : 0,
      });
      throw err;
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
        {messages.map((message, index) => (
          <li key={index} className={`message message-${message.role}`}>
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
