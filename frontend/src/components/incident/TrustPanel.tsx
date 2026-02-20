import { Shield, Check } from "lucide-react";

interface TrustPanelProps {
  trustScore: number;
}

export function TrustPanel({ trustScore }: TrustPanelProps) {
  const signals = [
    "Checked against similar past incidents",
    "Matches patterns found in monitoring data",
    "No conflicting signals detected",
  ];

  return (
    <div className="card-surface p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">AI Reliability</h3>
      </div>

      <div className="space-y-2.5 mb-5">
        {signals.map((signal, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <div className="w-4 h-4 rounded-full bg-severity-healthy/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-2.5 w-2.5 text-severity-healthy" />
            </div>
            <span className="text-muted-foreground">{signal}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-auto">
        <div className="flex-1 bg-muted/50 rounded-md p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            Confidence
          </div>
          <div className="font-mono font-semibold text-xl tabular-nums text-foreground">{trustScore}%</div>
          <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-severity-healthy transition-all duration-700"
              style={{ width: `${trustScore}%` }}
            />
          </div>
        </div>
        <div className="flex-1 bg-muted/50 rounded-md p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            Risk of error
          </div>
          <div className="font-semibold text-xl text-severity-healthy">Low</div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-severity-healthy" />
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="w-2 h-2 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
