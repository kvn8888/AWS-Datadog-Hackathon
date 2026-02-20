import { timelineEntries } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Bot, FileText, Circle } from "lucide-react";

export function TimelineTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="card-surface p-5">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">
            What happened — step by step
          </h3>
          <div className="relative">
            <div className="absolute left-[86px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-0">
              {timelineEntries.map((entry, i) => {
                const isAgent = entry.icon === "agent";
                const isAlert = entry.icon === "alert";
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-4 px-3 py-3 rounded-md ${
                      isAlert ? "bg-severity-critical/[0.03]" : ""
                    }`}
                  >
                    <span className="font-mono text-xs text-muted-foreground shrink-0 w-[65px] text-right tabular-nums">
                      {entry.time}
                    </span>
                    <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 z-10 ${
                      isAlert ? "bg-severity-critical border-severity-critical" :
                      isAgent ? "bg-primary border-primary" :
                      "bg-muted border-border"
                    }`} />
                    <span className="shrink-0">
                      {isAlert ? <AlertCircle className="h-4 w-4 text-severity-critical" /> :
                       isAgent ? <Bot className="h-4 w-4 text-primary" /> :
                       entry.icon === "deploy" ? <Circle className="h-4 w-4 text-severity-warning" /> :
                       <FileText className="h-4 w-4 text-muted-foreground" />}
                    </span>
                    <span className={`text-sm leading-relaxed ${
                      isAlert ? "text-severity-critical font-medium" :
                      isAgent ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {entry.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
