import { Sparkles, Zap } from "lucide-react";

interface AIInsightSummaryProps {
  visible: boolean;
}

export function AIInsightSummary({ visible }: AIInsightSummaryProps) {
  if (!visible) return null;

  return (
    <div className="card-surface p-6 border-l-2 border-l-primary animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">
          AI Summary
        </h3>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-foreground">
          Response times increased{" "}
          <span className="text-severity-critical font-semibold">13×</span>
          {" "}due to{" "}
          <span className="font-medium">database connection pool running out of capacity</span>,
          triggered by deployment{" "}
          <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">v2.4.1</span>.
        </p>

        <div>
          <span className="text-xs font-medium text-muted-foreground">
            Services affected
          </span>
          <div className="flex gap-2 mt-2">
            {["auth-service", "session-manager", "checkout-api"].map((svc) => (
              <span
                key={svc}
                className="text-xs font-mono px-2.5 py-1 bg-severity-warning/8 text-severity-warning border border-severity-warning/15 rounded-md"
              >
                {svc}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 bg-severity-healthy/[0.04] border border-severity-healthy/15 rounded-md p-3">
          <Zap className="h-4 w-4 text-severity-healthy mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-medium text-severity-healthy">
              Suggested fix
            </span>
            <p className="text-sm mt-0.5">
              Roll back to the previous version (v2.3.9) and increase the connection pool size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
