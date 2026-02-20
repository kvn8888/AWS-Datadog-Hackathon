import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Zap, FlaskConical, Wrench, Check, X, ArrowRight, RefreshCw } from 'lucide-react';
import type { AgentStatus, LogType } from '@/data/mockData';

interface AgentState {
  planner: AgentStatus;
  creator: AgentStatus;
  validator: AgentStatus;
  fixer: AgentStatus;
}

interface LogEntry {
  id: number;
  type: LogType;
  agent: string;
  text: string;
}

const agentConfig = [
  {
    id: 'planner' as const,
    label: 'Curriculum Planner',
    icon: BookOpen,
    color: 'text-blue-400',
    activeBg: 'bg-blue-400/10 border-blue-400/30',
    doneBg: 'bg-green-400/10 border-green-400/30',
    failedBg: 'bg-red-400/10 border-red-400/30',
    idleBg: 'bg-muted border-border',
  },
  {
    id: 'creator' as const,
    label: 'Lesson Creator',
    icon: Zap,
    color: 'text-purple-400',
    activeBg: 'bg-purple-400/10 border-purple-400/30',
    doneBg: 'bg-green-400/10 border-green-400/30',
    failedBg: 'bg-red-400/10 border-red-400/30',
    idleBg: 'bg-muted border-border',
  },
  {
    id: 'validator' as const,
    label: 'Code Validator',
    icon: FlaskConical,
    color: 'text-amber-400',
    activeBg: 'bg-amber-400/10 border-amber-400/30',
    doneBg: 'bg-green-400/10 border-green-400/30',
    failedBg: 'bg-red-400/10 border-red-400/30',
    idleBg: 'bg-muted border-border',
  },
  {
    id: 'fixer' as const,
    label: 'Code Fixer',
    icon: Wrench,
    color: 'text-green-400',
    activeBg: 'bg-green-400/10 border-green-400/30',
    doneBg: 'bg-green-400/10 border-green-400/30',
    failedBg: 'bg-red-400/10 border-red-400/30',
    idleBg: 'bg-muted border-border',
  },
];

function getAgentBg(cfg: typeof agentConfig[0], status: AgentStatus) {
  if (status === 'active') return cfg.activeBg;
  if (status === 'done') return cfg.doneBg;
  if (status === 'failed') return cfg.failedBg;
  return cfg.idleBg;
}

function getAgentIcon(cfg: typeof agentConfig[0], status: AgentStatus) {
  if (status === 'done') return <Check className="w-4 h-4 text-green-400" />;
  if (status === 'failed') return <X className="w-4 h-4 text-red-400" />;
  if (status === 'active') return <cfg.icon className={`w-4 h-4 ${cfg.color} animate-pulse`} />;
  return <cfg.icon className="w-4 h-4 text-muted-foreground" />;
}

export default function GeneratePage() {
  const [searchParams] = useSearchParams();
  const topic = searchParams.get('topic') || 'React Hooks';
  const navigate = useNavigate();

  const [agents, setAgents] = useState<AgentState>({
    planner: 'idle',
    creator: 'idle',
    validator: 'idle',
    fixer: 'idle',
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [feedbackLoops, setFeedbackLoops] = useState(0);
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  function setAgent(id: keyof AgentState, status: AgentStatus) {
    setAgents(prev => ({ ...prev, [id]: status }));
  }

  function addLog(agent: string, type: LogType, text: string) {
    logIdRef.current += 1;
    setLogs(prev => [...prev, { id: logIdRef.current, agent, type, text }]);
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    // ─── Stage 1: Curriculum Planner ───────────────────────────
    t(300, () => { setAgent('planner', 'active'); setProgress(5); });
    t(800, () => addLog('planner', 'info', `Analyzing topic: "${topic}"...`));
    t(1800, () => addLog('planner', 'success', 'Planned 6 lessons: useState, useEffect, useRef, useContext, useReducer, custom hooks'));
    t(2600, () => addLog('planner', 'success', 'Estimated completion: 42 minutes — difficulty: beginner-friendly'));
    t(3200, () => { setAgent('planner', 'done'); setProgress(18); });

    // ─── Stage 2: Lesson Creator ────────────────────────────────
    t(3400, () => { setAgent('creator', 'active'); });
    t(3800, () => addLog('creator', 'info', 'Writing Lesson 1: Introduction to React Hooks...'));
    t(4800, () => addLog('creator', 'success', '✓ Lesson 1 written — narration + 1 code example queued'));
    t(5200, () => addLog('creator', 'info', 'Writing Lesson 2: useEffect and Side Effects...'));
    t(6200, () => addLog('creator', 'success', '✓ Lesson 2 written — narration + 2 code examples queued'));
    t(6600, () => addLog('creator', 'info', 'Writing Lessons 3–6...'));
    t(7600, () => addLog('creator', 'success', '✓ All 6 lessons written — 7 code examples ready for validation'));
    t(8200, () => { setAgent('creator', 'done'); setProgress(40); });

    // ─── Stage 3: Code Validator (first pass) ───────────────────
    t(8400, () => { setAgent('validator', 'active'); });
    t(8800, () => addLog('validator', 'info', 'Running 7 code examples in isolated sandbox...'));
    t(9800, () => addLog('validator', 'success', '✓ Example 1 (useState Counter) — PASSED'));
    t(10600, () => { setProgress(52); addLog('validator', 'error', '✗ Example 2 (useEffect + deps) — FAILED: missing dependency array'); });
    t(11000, () => { setAgent('validator', 'failed'); setAgent('fixer', 'active'); setFeedbackLoops(l => l + 1); });

    // ─── Stage 4: Code Fixer (loop 1) ───────────────────────────
    t(11400, () => addLog('fixer', 'fix', 'Analyzing failure: useEffect dependency array is empty []'));
    t(12200, () => addLog('fixer', 'fix', 'Rewriting: added [count] to dependency array, switched to functional updater'));
    t(13000, () => addLog('fixer', 'success', '✓ Code rewritten — sending back to validator'));
    t(13400, () => { setAgent('fixer', 'done'); setAgent('validator', 'active'); setProgress(58); });

    // ─── Stage 5: Validator re-check ────────────────────────────
    t(13800, () => addLog('validator', 'info', 'Re-testing Example 2 (attempt 2)...'));
    t(14600, () => addLog('validator', 'success', '✓ Example 2 — PASSED (attempt 2)'));
    t(15200, () => addLog('validator', 'success', '✓ Example 3 (fetch with useEffect) — PASSED'));
    t(16000, () => addLog('validator', 'success', '✓ Example 4 (useRef focus) — PASSED'));
    t(16800, () => addLog('validator', 'success', '✓ Example 5 (useContext theme) — PASSED'));
    t(17400, () => { setProgress(72); addLog('validator', 'error', '✗ Example 6 (useLocalStorage) — FAILED: localStorage access throws in SSR'); });
    t(17800, () => { setAgent('validator', 'failed'); setAgent('fixer', 'active'); setFeedbackLoops(l => l + 1); });

    // ─── Stage 6: Code Fixer (loop 2) ───────────────────────────
    t(18200, () => addLog('fixer', 'fix', 'Analyzing failure: localStorage throws in restricted environments'));
    t(19000, () => addLog('fixer', 'fix', 'Rewriting: wrapped localStorage calls in try/catch, added missing dep "key"'));
    t(19800, () => addLog('fixer', 'success', '✓ Code rewritten — sending back to validator'));
    t(20200, () => { setAgent('fixer', 'done'); setAgent('validator', 'active'); setProgress(80); });

    // ─── Stage 7: Final validation ──────────────────────────────
    t(20600, () => addLog('validator', 'info', 'Re-testing Example 6 (attempt 2)...'));
    t(21400, () => addLog('validator', 'success', '✓ Example 6 — PASSED (attempt 2)'));
    t(22000, () => addLog('validator', 'success', '✓ Example 7 (useReducer cart) — PASSED'));
    t(22800, () => addLog('validator', 'success', 'All 7 code examples validated. 5 passed first try, 2 required fixes.'));
    t(23200, () => { setAgent('validator', 'done'); setProgress(100); });
    t(23800, () => setDone(true));

    return () => timers.forEach(clearTimeout);
  }, [topic]);

  const logTypeStyle: Record<LogType, string> = {
    success: 'log-success',
    error: 'log-error',
    fix: 'log-fix',
    info: 'log-info',
  };

  const logPrefix: Record<LogType, string> = {
    success: '✓',
    error: '✗',
    fix: '↻',
    info: '·',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Generating course
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Topic: <span className="text-foreground font-medium">"{topic}"</span>
            </p>
          </div>
          {done && (
            <button
              onClick={() => navigate('/course')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all glow-primary animate-fade-up"
            >
              View Course
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {done ? 'Complete' : 'Processing...'}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{progress}%</span>
        </div>
      </div>

      {/* Agent pipeline */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-stretch gap-0">
          {agentConfig.map((cfg, i) => {
            const status = agents[cfg.id];
            return (
              <div key={cfg.id} className="flex items-center flex-1">
                <div
                  className={`flex-1 p-3 rounded-lg border transition-all duration-400 ${getAgentBg(cfg, status)}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {getAgentIcon(cfg, status)}
                    <span
                      className={`text-[10px] font-mono font-medium uppercase tracking-wide ${
                        status === 'idle' ? 'text-muted-foreground' : cfg.color
                      }`}
                    >
                      Agent {i + 1}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-tight">{cfg.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                    {status === 'idle' ? 'Waiting' : status === 'active' ? 'Running...' : status === 'failed' ? 'Handoff' : 'Done'}
                  </p>
                </div>

                {i < agentConfig.length - 1 && (
                  <div className="flex flex-col items-center px-1.5 shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    {/* Show feedback arrow between validator and fixer */}
                    {i === 2 && feedbackLoops > 0 && (
                      <div className="flex items-center gap-0.5 mt-1">
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span className="text-[9px] text-amber-400 font-mono">{feedbackLoops}x</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {feedbackLoops > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/5 border border-amber-400/15">
            <RefreshCw className="w-3 h-3 text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-400">
              Validator → Fixer feedback loop triggered <strong>{feedbackLoops}x</strong> —
              broken code is being rewritten and re-tested automatically
            </p>
          </div>
        )}
      </div>

      {/* Live log */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-3">
          Live activity log
        </p>
        <div className="space-y-1.5 font-mono text-xs">
          {logs.map(log => (
            <div key={log.id} className={`flex items-start gap-2 animate-fade-up ${logTypeStyle[log.type]}`}>
              <span className="shrink-0 w-3 text-center mt-px">{logPrefix[log.type]}</span>
              <span className="text-muted-foreground shrink-0">[{log.agent}]</span>
              <span>{log.text}</span>
            </div>
          ))}
          {!done && logs.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
              <span className="w-3 text-center">·</span>
              <span>processing</span>
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '100ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
              </span>
            </div>
          )}
          {done && (
            <div className="mt-4 p-3 rounded-lg bg-green-400/5 border border-green-400/20 animate-fade-up">
              <p className="text-green-400 font-medium text-xs">
                ✓ Course generation complete — 6 lessons, 7 validated examples, {feedbackLoops} code fixes applied
              </p>
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
