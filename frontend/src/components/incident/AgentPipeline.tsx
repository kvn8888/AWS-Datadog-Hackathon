import { Check, Loader2 } from "lucide-react";
import { pipelineStages } from "@/data/mockData";

interface AgentPipelineProps {
  currentStage: number;
}

const stageLabels = [
  "Alert received",
  "Collecting evidence",
  "Mapping dependencies",
  "Analyzing root cause",
  "Drafting response",
  "Waiting for approval",
];

export function AgentPipeline({ currentStage }: AgentPipelineProps) {
  return (
    <div className="card-surface p-5 animate-fade-up">
      <div className="text-xs font-medium text-muted-foreground mb-4">
        Analysis Progress
      </div>
      <div className="flex items-center gap-0.5">
        {pipelineStages.map((stage, i) => {
          const completed = i < currentStage;
          const active = i === currentStage;
          return (
            <div key={stage} className="flex items-center gap-0.5 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    completed
                      ? "bg-severity-healthy/10 text-severity-healthy border border-severity-healthy/20"
                      : active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {completed ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="font-mono text-[10px]">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1.5 text-center leading-tight font-medium ${
                    completed ? "text-severity-healthy" : active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {stageLabels[i]}
                </span>
              </div>
              {i < pipelineStages.length - 1 && (
                <div className="h-px flex-1 min-w-[8px] mt-[-14px]">
                  <div className={`h-full transition-colors duration-300 ${
                    i < currentStage ? "bg-severity-healthy" : "bg-border"
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
