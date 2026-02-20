import { blastRadiusNodes, blastRadiusEdges } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Shield, CheckCircle } from "lucide-react";

const statusConfig = {
  down: { label: "Failing", color: "text-severity-critical", bg: "bg-severity-critical/10", icon: AlertCircle },
  affected: { label: "Degraded", color: "text-severity-warning", bg: "bg-severity-warning/10", icon: AlertTriangle },
  "at-risk": { label: "At risk", color: "text-severity-warning", bg: "bg-severity-warning/8", icon: Shield },
  healthy: { label: "Healthy", color: "text-severity-healthy", bg: "bg-severity-healthy/10", icon: CheckCircle },
};

export function BlastRadiusTab() {
  // Group nodes by status
  const grouped = {
    down: blastRadiusNodes.filter((n) => n.status === "down"),
    affected: blastRadiusNodes.filter((n) => n.status === "affected"),
    "at-risk": blastRadiusNodes.filter((n) => n.status === "at-risk"),
    healthy: blastRadiusNodes.filter((n) => n.status === "healthy"),
  };

  // Build dependency map
  const dependencyMap = new Map<string, string[]>();
  blastRadiusEdges.forEach((edge) => {
    if (!dependencyMap.has(edge.from)) dependencyMap.set(edge.from, []);
    dependencyMap.get(edge.from)!.push(edge.to);
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {(["down", "affected", "at-risk", "healthy"] as const).map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const count = grouped[status].length;
            return (
              <div key={status} className="card-surface p-4 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                </div>
                <div className="text-2xl font-semibold tabular-nums text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {count === 1 ? "service" : "services"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Service list by status */}
        <div className="card-surface p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">Affected Services</h3>
          <div className="space-y-4">
            {(["down", "affected", "at-risk", "healthy"] as const).map((status) => {
              const config = statusConfig[status];
              const nodes = grouped[status];
              if (nodes.length === 0) return null;
              const Icon = config.icon;
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <div className="space-y-1 ml-5">
                    {nodes.map((node) => {
                      const deps = dependencyMap.get(node.id) || [];
                      return (
                        <div key={node.id} className={`flex items-center gap-3 p-3 rounded-md ${config.bg}`}>
                          <span className="text-sm font-mono font-medium text-foreground">{node.label}</span>
                          {deps.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              → depends on {deps.join(", ")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact summary */}
        <div className="card-surface p-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-2xl font-semibold text-severity-critical tabular-nums">3</div>
              <div className="text-xs text-muted-foreground">Directly impacted</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-semibold text-severity-warning tabular-nums">2</div>
              <div className="text-xs text-muted-foreground">At risk</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-2xl font-semibold text-foreground tabular-nums">12,430</div>
              <div className="text-xs text-muted-foreground">Users affected</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            2 hops deep · 14ms query
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
