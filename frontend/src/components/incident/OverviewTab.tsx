import { Check, X, Brain, Zap, Star } from "lucide-react";
import { Hypothesis, RecommendedAction } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentPipeline } from "./AgentPipeline";
import { AIInsightSummary } from "./AIInsightSummary";
import { TrustPanel } from "./TrustPanel";

interface OverviewTabProps {
  currentStage: number;
  hypotheses: Hypothesis[];
  actions: RecommendedAction[];
  onActionUpdate: (id: number, status: "approved" | "dismissed") => void;
  trustScore: number;
}

export function OverviewTab({ currentStage, hypotheses, actions, onActionUpdate, trustScore }: OverviewTabProps) {
  const riskColor = { LOW: "text-severity-healthy", MEDIUM: "text-severity-warning", HIGH: "text-severity-critical" };
  const riskBg = { LOW: "bg-severity-healthy/10", MEDIUM: "bg-severity-warning/10", HIGH: "bg-severity-critical/10" };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <AgentPipeline currentStage={currentStage} />

        <AIInsightSummary visible={currentStage >= 3} />

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 card-surface p-6 hover-lift">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Possible Causes</h3>
            </div>
            <div className="space-y-3">
              {hypotheses.map((h) => (
                <div key={h.id} className="bg-muted/50 rounded-md p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {h.title}
                    </span>
                    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-md ${
                      h.confidence >= 75 ? "bg-severity-healthy/10 text-severity-healthy" :
                      h.confidence >= 50 ? "bg-severity-warning/10 text-severity-warning" :
                      "bg-severity-critical/10 text-severity-critical"
                    }`}>
                      {h.confidence}% likely
                    </span>
                  </div>
                  <div className="w-full h-1 bg-muted rounded-full mb-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        h.confidence >= 75 ? "bg-severity-healthy" :
                        h.confidence >= 50 ? "bg-severity-warning" : "bg-severity-critical"
                      }`}
                      style={{ width: `${h.confidence}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{h.description}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {h.evidenceTags.map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 bg-muted text-muted-foreground rounded-md border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1">
            <TrustPanel trustScore={trustScore} />
          </div>
        </div>

        <div className="card-surface p-6 hover-lift">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Suggested Actions</h3>
          </div>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <div
                key={action.id}
                className={`flex items-center justify-between rounded-md p-4 border transition-colors ${
                  i === 0 && action.status === "awaiting"
                    ? "bg-severity-healthy/[0.03] border-severity-healthy/20"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  {i === 0 && action.status === "awaiting" && (
                    <span className="text-[11px] font-medium px-2 py-0.5 bg-severity-healthy/10 text-severity-healthy rounded-md shrink-0 flex items-center gap-1">
                      <Star className="h-3 w-3" /> Recommended
                    </span>
                  )}
                  <span className="text-sm text-foreground">{action.description}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 ${riskBg[action.risk]} ${riskColor[action.risk]}`}>
                    {action.risk} risk
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {action.status === "awaiting" ? (
                    <>
                      <button
                        onClick={() => onActionUpdate(action.id, "approved")}
                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onActionUpdate(action.id, "dismissed")}
                        className="text-xs font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : action.status === "approved" ? (
                    <span className="flex items-center gap-1.5 text-xs text-severity-healthy">
                      <Check className="h-3.5 w-3.5" /> Approved — running
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <X className="h-3.5 w-3.5" /> Dismissed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
