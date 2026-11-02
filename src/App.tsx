import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { AssistantPanel } from "./components/AssistantPanel";

declare global {
  interface Window {
    pendo?: {
      initialize: (options: {
        visitor: { id: string; email?: string; role?: string };
        account: { id: string; name?: string };
      }) => void;
      track: (event: string, properties?: Record<string, string | number | boolean>) => void;
    };
  }
}

interface Agent {
  id: string;
  email: string;
  role: "agent" | "supervisor";
  teamId: string;
  teamName: string;
}

function TicketsPage() {
  return (
    <section>
      <h1>Tickets</h1>
      <button id="new-ticket-button" type="button">
        New ticket
      </button>
    </section>
  );
}

function ReportsPage() {
  return (
    <section>
      <h1>Reports</h1>
      <button id="export-report-button" type="button">
        Export CSV
      </button>
    </section>
  );
}

export function App() {
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    void fetch("/api/me")
      .then((response) => response.json())
      .then((me: Agent) => {
        setAgent(me);
        window.pendo?.initialize({
          visitor: { id: me.id, email: me.email, role: me.role },
          account: { id: me.teamId, name: me.teamName },
        });
      });
  }, []);

  return (
    <div>
      <nav>
        <NavLink to="/">Tickets</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <span>{agent?.email}</span>
      </nav>
      <Routes>
        <Route path="/" element={<TicketsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
      <AssistantPanel />
    </div>
  );
}
