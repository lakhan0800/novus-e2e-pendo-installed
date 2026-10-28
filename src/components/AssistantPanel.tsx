import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantPanelProps {
  agentRole?: string;
  teamId?: string;
}

/** Chat panel backed by /api/assistant (LLM-backed in full Taskly stack). */
export function AssistantPanel({ agentRole, teamId }: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [pending, setPending] = useState(false);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const prompt = input;
    const next = [...messages, { role: "user" as const, content: prompt }];
    setMessages(next);
    setInput("");
    setPending(true);
    const startedAt = performance.now();
    try {
      const reply = await api.post<{ reply: string }>("/api/assistant", { messages: next });
      setMessages([...next, { role: "assistant", content: reply.reply }]);
      // Pendo Track Event: the AI reply arrived and was added to the conversation.
      // Only counts and lengths are sent — never message text, which may contain customer PII.
      window.pendo?.track?.("assistant_reply_received", {
        conversationTurnCount: next.length,
        promptLength: prompt.length,
        replyLength: reply.reply.length,
        latencyMs: Math.round(performance.now() - startedAt),
        agentRole: agentRole ?? "unknown",
        teamId: teamId ?? "unknown",
      });
    } catch (error) {
      // Pendo Track Event: POST /api/assistant returned a non-2xx status or the network call failed.
      // errorStatus is 0 when there was no HTTP response (e.g. network failure).
      window.pendo?.track?.("assistant_reply_failed", {
        conversationTurnCount: next.length,
        errorStatus: error instanceof ApiError ? error.status : 0,
        errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 100),
        latencyMs: Math.round(performance.now() - startedAt),
        agentRole: agentRole ?? "unknown",
        teamId: teamId ?? "unknown",
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
