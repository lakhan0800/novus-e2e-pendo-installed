import { useState, type FormEvent } from "react";
import { api } from "../api/client";

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
    const promptLength = input.length;
    const userTurnCount = next.filter((message) => message.role === "user").length;
    setMessages(next);
    setInput("");
    setPending(true);
    const startedAt = Date.now();
    try {
      const reply = await api.post<{ reply: string }>("/api/assistant", { messages: next });
      setMessages([...next, { role: "assistant", content: reply.reply }]);
      // Pendo: assistant backend returned a reply. Counts/timings only — no message text (PII).
      window.pendo?.track("ai_assistant_response_received", {
        conversation_message_count: next.length + 1,
        user_turn_count: userTurnCount,
        prompt_length: promptLength,
        reply_length: reply.reply.length,
        latency_ms: Date.now() - startedAt,
      });
    } catch (error) {
      // Pendo: assistant request failed (non-2xx or network error).
      window.pendo?.track("ai_assistant_response_failed", {
        conversation_message_count: next.length,
        user_turn_count: userTurnCount,
        error_message: (error instanceof Error ? error.message : String(error)).slice(0, 100),
        latency_ms: Date.now() - startedAt,
      });
      throw error;
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
