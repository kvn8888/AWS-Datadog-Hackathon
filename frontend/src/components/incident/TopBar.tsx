import { useState, useEffect, useCallback } from "react";
import { Activity, Shield, Users, TrendingUp } from "lucide-react";
import { Incident, Severity } from "@/data/mockData";

interface TopBarProps {
  activeIncident: Incident | null;
  onSimulateAlert: () => void;
  isSimulating: boolean;
  bannerFlash: boolean;
  trustScore: number;
}

const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

export function TopBar({ activeIncident, onSimulateAlert, isSimulating, bannerFlash, trustScore }: TopBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeIncident || activeIncident.status === "resolved") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [activeIncident]);

  const formatElapsed = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec.toString().padStart(2, "0")}s`;
  }, []);

  const isActive = activeIncident && activeIncident.status !== "resolved";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex flex-col bg-card border-b border-border ${
        bannerFlash ? "banner-flash" : ""
      }`}
    >
      <div className="h-12 flex items-center justify-between px-5">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-[15px]">IncidentGraph</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {isActive && (
            <>
              <span className="w-2 h-2 rounded-full bg-severity-critical pulse-dot" />
              <span className="font-medium text-severity-critical text-xs">
                {severityLabel[activeIncident.severity]} Incident
              </span>
              <span className="text-foreground font-medium">{activeIncident.service}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground font-mono text-xs tabular-nums">{formatElapsed(elapsed)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={onSimulateAlert}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSimulating ? "Simulating…" : "Simulate Alert"}
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {["Datadog", "Neo4j", "Bedrock"].map((name) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-severity-healthy" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isActive && (
        <div className="h-9 flex items-center justify-center gap-8 px-5 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2 text-xs">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">AI Confidence</span>
            <span className={`font-mono font-semibold tabular-nums ${trustScore >= 80 ? "text-severity-healthy" : trustScore >= 60 ? "text-severity-warning" : "text-severity-critical"}`}>
              {trustScore}%
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Assessment</span>
            <span className="font-medium text-severity-healthy">High confidence</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Users affected</span>
            <span className="font-mono font-semibold text-severity-critical tabular-nums">12,430</span>
          </div>
        </div>
      )}
    </header>
  );
}
