import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, AlertTriangle, Gauge, Cpu, ExternalLink } from "lucide-react";

interface MetricCard {
  label: string;
  value: string;
  change: string;
  severity: "critical" | "warning" | "healthy";
  icon: React.ReactNode;
}

const metricCards: MetricCard[] = [
  { label: "Response time (p99)", value: "2,340ms", change: "+1,200%", severity: "critical", icon: <TrendingUp className="h-4 w-4" /> },
  { label: "Error rate", value: "12.4%", change: "+4,033%", severity: "critical", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Connection pool", value: "48/50", change: "Nearly full", severity: "warning", icon: <Gauge className="h-4 w-4" /> },
  { label: "CPU usage", value: "34%", change: "Normal", severity: "healthy", icon: <Cpu className="h-4 w-4" /> },
];

const sevClasses = {
  critical: { text: "text-severity-critical", bg: "bg-severity-critical/8" },
  warning: { text: "text-severity-warning", bg: "bg-severity-warning/8" },
  healthy: { text: "text-severity-healthy", bg: "bg-severity-healthy/8" },
};

const traceEntries = [
  { id: "7f3a2b1c", method: "POST", path: "/api/charge", duration: "2,341ms", bottleneck: "Database query took 2,180ms", severity: "critical" as const },
  { id: "8e4b3c2d", method: "POST", path: "/api/charge", duration: "1,892ms", bottleneck: "Database query took 1,740ms", severity: "warning" as const },
  { id: "9d5c4e3f", method: "POST", path: "/api/refund", duration: "Timed out", bottleneck: "Exceeded 3s limit", severity: "critical" as const },
];

const deployEntries = [
  { version: "v2.4.1", author: "j.chen", message: "Update connection pool config", time: "14:22 UTC", highlight: true },
  { version: "v3.1.0", author: "m.smith", message: "Add rate limiting", time: "13:15 UTC", highlight: false },
];

export function EvidenceTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-3">
            Key Metrics
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {metricCards.map((m) => {
              const s = sevClasses[m.severity];
              return (
                <div key={m.label} className="card-surface p-4 hover-lift">
                  <div className="flex items-center justify-between mb-3">
                    <span className={s.text}>{m.icon}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${s.text} ${s.bg}`}>
                      {m.severity === "critical" ? "Critical" : m.severity === "warning" ? "Warning" : "OK"}
                    </span>
                  </div>
                  <div className="text-xl font-mono font-semibold text-foreground tabular-nums">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
                  <div className={`text-xs font-medium mt-1.5 ${s.text}`}>{m.change}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Traces */}
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground">
              Related Traces
            </h3>
            <a href="#" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              View in Datadog <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-1">
            {traceEntries.map((t) => (
              <div key={t.id} className={`flex items-center gap-4 font-mono text-xs p-3 rounded-md ${
                t.severity === "critical" ? "bg-severity-critical/[0.03] border border-severity-critical/10" : "bg-muted/30"
              }`}>
                <span className="text-muted-foreground w-[70px] shrink-0">{t.id}</span>
                <span className="text-primary w-[40px] shrink-0 font-medium">{t.method}</span>
                <span className="text-foreground flex-1">{t.path}</span>
                <span className={`font-medium tabular-nums ${t.severity === "critical" ? "text-severity-critical" : "text-severity-warning"}`}>
                  {t.duration}
                </span>
                <span className="text-muted-foreground text-[11px] font-sans">{t.bottleneck}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deploys */}
        <div className="card-surface p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">
            Recent Deployments
          </h3>
          <div className="space-y-1">
            {deployEntries.map((d) => (
              <div key={d.version} className={`flex items-center gap-4 text-sm p-3 rounded-md ${
                d.highlight ? "bg-severity-critical/[0.03] border border-severity-critical/10" : "bg-muted/30"
              }`}>
                <span className={`font-mono text-xs font-medium ${d.highlight ? "text-severity-critical" : "text-foreground"}`}>{d.version}</span>
                <span className="text-primary text-xs">{d.author}</span>
                <span className="text-muted-foreground flex-1">{d.message}</span>
                <span className="text-muted-foreground text-xs font-mono tabular-nums">{d.time}</span>
                {d.highlight && (
                  <span className="text-[11px] px-2 py-0.5 bg-severity-critical/10 text-severity-critical rounded-md font-medium">
                    Likely cause
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Historical */}
        <div className="card-surface p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">
            Similar Past Incidents
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-sm p-3 bg-primary/[0.03] border border-primary/10 rounded-md">
              <span className="text-primary font-mono text-xs font-medium">INC-0623</span>
              <span className="text-foreground flex-1">Similar connection pool issue — fixed by rolling back</span>
              <span className="text-muted-foreground text-xs">Jan 2024</span>
              <span className="text-[11px] px-2 py-0.5 bg-severity-healthy/10 text-severity-healthy rounded-md font-medium">87% match</span>
            </div>
            <div className="flex items-center gap-3 text-sm p-3 bg-muted/30 rounded-md">
              <span className="text-muted-foreground font-mono text-xs font-medium">INC-0489</span>
              <span className="text-muted-foreground flex-1">Database connections exhausted after config change</span>
              <span className="text-muted-foreground text-xs">Nov 2023</span>
              <span className="text-[11px] px-2 py-0.5 bg-severity-warning/10 text-severity-warning rounded-md font-medium">64% match</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
