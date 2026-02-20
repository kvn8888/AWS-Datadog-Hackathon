import { useState } from "react";
import { Copy, Check, Sparkles, Send } from "lucide-react";
import { runbookContent, chatMessages, ChatMessage } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";

const suggestions = [
  "Why did this fail?",
  "Show affected services",
  "Compare to past incidents",
  "How long until recovery?",
];

export function RightPanel() {
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [chatInput, setChatInput] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(runbookContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSuggestionClick = (text: string) => {
    setChatInput(text);
  };

  return (
    <aside className="w-[300px] shrink-0 border-l border-border bg-card flex flex-col h-full">
      {/* Runbook */}
      <div className="flex-1 flex flex-col border-b border-border min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground">
            Response Playbook
          </h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-severity-healthy" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {runbookContent.split("\n").map((line, i) => {
              if (line.startsWith("## ")) {
                return <div key={i} className="text-foreground font-sans font-semibold text-sm mt-3 mb-1.5">{line.replace("## ", "")}</div>;
              }
              if (line.startsWith("### ")) {
                return <div key={i} className="text-primary font-sans font-medium text-xs mt-2.5 mb-1">{line.replace("### ", "")}</div>;
              }
              if (line.startsWith("**")) {
                return <div key={i} className="text-foreground/80">{line.replace(/\*\*/g, "")}</div>;
              }
              if (line.startsWith("```")) return null;
              if (line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") || line.startsWith("-")) {
                return <div key={i} className="pl-2">{line}</div>;
              }
              return <div key={i}>{line}</div>;
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Agent Chat */}
      <div className="h-[300px] flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <h2 className="text-xs font-semibold text-muted-foreground">
            AI Assistant
          </h2>
        </div>

        <ScrollArea className="flex-1 px-3 py-2.5">
          <div className="space-y-2.5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed p-3 rounded-md ${
                  msg.role === "agent"
                    ? "bg-muted/50 border border-border"
                    : "bg-primary/[0.04] ml-4 border border-primary/10"
                }`}
              >
                <span className={`text-[11px] font-medium block mb-1 ${
                  msg.role === "agent" ? "text-primary" : "text-muted-foreground"
                }`}>
                  {msg.role === "agent" ? "Assistant" : "You"}
                </span>
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Suggestions */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex gap-1.5 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="text-[11px] px-2 py-1 bg-muted text-muted-foreground border border-border rounded-md hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2.5 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about this incident…"
              className="flex-1 bg-muted/50 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20 transition-colors"
            />
            <button className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
