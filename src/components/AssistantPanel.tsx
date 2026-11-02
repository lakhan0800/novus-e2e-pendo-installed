import { useState, type FormEvent } from "react";
import { api } from "../api/client";

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Extracts the HTTP status from api client errors ("POST /api/assistant failed with 503").
 * Anything else (e.g. a fetch network failure) is reported as "network_error".
 */
function getErrorStatus(error: unknown): string {
  const match = error instanceof Error ? /failed with (\d{3})$/.exec(error.message) : null;
  return match ? match[1] : "network_error";
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
    setMessages(next);
    setInput("");
    setPending(true);
    // Only lengths/counts are tracked — never raw message content (may contain customer PII).
    const promptLength = input.length;
    const startedAt = performance.now();
    try {
      const reply = await api.post<{ reply: string }>("/api/assistant", { messages: next });
      setMessages([...next, { role: "assistant", content: reply.reply }]);
      // Pendo Track Event: the AI assistant answered and the reply was added to the conversation.
      window.pendo?.track("assistant_response_received", {
        message_count: next.length + 1,
        prompt_length: promptLength,
        reply_length: reply.reply.length,
        latency_ms: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      // Pendo Track Event: the /api/assistant request failed (non-OK HTTP status or network error).
      window.pendo?.track("assistant_request_failed", {
        message_count: next.length,
        prompt_length: promptLength,
        error_status: getErrorStatus(error),
        latency_ms: Math.round(performance.now() - startedAt),
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
