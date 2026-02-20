import { Incident, Severity } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IncidentFeedProps {
  incidents: Incident[];
  activeId: string;
  onSelect: (id: string) => void;
}

const severityConfig: Record<Severity, { color: string; label: string; dot: string }> = {
  critical: { color: "text-severity-critical", label: "Critical", dot: "bg-severity-critical" },
  warning: { color: "text-severity-warning", label: "Warning", dot: "bg-severity-warning" },
  info: { color: "text-severity-healthy", label: "Resolved", dot: "bg-severity-healthy" },
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  investigating: { bg: "bg-severity-warning/10", text: "text-severity-warning", label: "Investigating" },
  identified: { bg: "bg-primary/10", text: "text-primary", label: "Identified" },
  resolved: { bg: "bg-severity-healthy/10", text: "text-severity-healthy", label: "Resolved" },
};

export function IncidentFeed({ incidents, activeId, onSelect }: IncidentFeedProps) {
  return (
    <aside className="w-[260px] shrink-0 border-r border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground">
          Active Incidents
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {incidents.map((inc) => {
            const sev = severityConfig[inc.severity];
            const stat = statusConfig[inc.status];
            const isActive = inc.id === activeId;
            return (
              <button
                key={inc.id}
                onClick={() => onSelect(inc.id)}
                className={`text-left px-4 py-3 border-b border-border transition-colors ${
                  isActive
                    ? "bg-primary/[0.04] border-l-2 border-l-primary"
                    : "border-l-2 border-l-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                  <span className={`text-xs font-medium ${sev.color}`}>
                    {sev.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {inc.relativeTime}
                  </span>
                </div>
                <div className="text-sm font-medium text-foreground mb-0.5">
                  {inc.service}
                </div>
                <div className="text-xs text-muted-foreground truncate mb-2">
                  {inc.description}
                </div>
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md ${stat.bg} ${stat.text}`}>
                  {stat.label}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
