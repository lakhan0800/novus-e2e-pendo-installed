import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

declare global {
  interface Window {
    pendo?: {
      initialize: (options: {
        visitor: { id: string; email?: string; role?: string };
        account: { id: string; name?: string };
      }) => void;
      track: (event: string, properties?: Record<string, unknown>) => void;
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

interface PageProps {
  agent: Agent | null;
}

function TicketsPage({ agent }: PageProps) {
  return (
    <section>
      <h1>Tickets</h1>
      <button
        id="new-ticket-button"
        type="button"
        onClick={() => {
          // Track Event: the agent started creating a new support ticket.
          window.pendo?.track("Ticket Creation Started", {
            agent_role: agent?.role ?? "unknown",
          });
        }}
      >
        New ticket
      </button>
    </section>
  );
}

function ReportsPage({ agent }: PageProps) {
  return (
    <section>
      <h1>Reports</h1>
      <button
        id="export-report-button"
        type="button"
        onClick={() => {
          // Track Event: the agent requested a CSV export of the report.
          window.pendo?.track("Report Export Requested", {
            export_format: "csv",
            agent_role: agent?.role ?? "unknown",
          });
        }}
      >
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
        <Route path="/" element={<TicketsPage agent={agent} />} />
        <Route path="/reports" element={<ReportsPage agent={agent} />} />
      </Routes>
    </div>
  );
}
