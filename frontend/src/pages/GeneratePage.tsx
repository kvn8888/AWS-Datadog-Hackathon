import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Zap, FlaskConical, Wrench, Check, X, ArrowRight, RefreshCw } from 'lucide-react';
import type { AgentStatus, LogType } from '@/data/mockData';

const BACKEND_URL = 'http://localhost:8000';

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
  const difficulty = searchParams.get('difficulty') || 'intermediate';
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
  const [courseId, setCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  function setAgent(id: keyof AgentState, status: AgentStatus) {
    setAgents(prev => ({ ...prev, [id]: status }));
  }

  function addLog(agent: string, type: LogType, text: string) {
    logIdRef.current += 1;
    setLogs(prev => [...prev, { id: logIdRef.current, agent, type, text }]);
  }

  function bumpProgress(min: number) {
    progressRef.current = Math.max(progressRef.current, min);
    setProgress(progressRef.current);
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    let es: EventSource | null = null;
    let aborted = false;

    async function start() {
      try {
        // 1. POST to start generation
        addLog('system', 'info', `Connecting to backend...`);
        const res = await fetch(`${BACKEND_URL}/course/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, difficulty }),
        });

        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const { courseId: id } = await res.json();
        if (aborted) return;

        setCourseId(id);
        localStorage.setItem('lastCourseId', id);
        localStorage.setItem('lastCourseTopic', topic);
        localStorage.setItem('lastCourseStart', Date.now().toString());

        addLog('system', 'success', `Generation started — ID: ${id.slice(0, 8)}...`);

        // 2. Subscribe to SSE stream
        es = new EventSource(`${BACKEND_URL}/course/${id}/stream`);

        es.onmessage = (e) => {
          if (aborted) return;
          try {
            const event = JSON.parse(e.data);
            handleEvent(event, id);
          } catch {
            // ignore parse errors
          }
        };

        es.onerror = () => {
          if (!aborted && !done) {
            // EventSource auto-reconnects on error; only log if we haven't completed
            // Close and show error only if it's a real failure (not just stream end)
            if (es?.readyState === EventSource.CLOSED) {
              addLog('system', 'error', 'Stream connection lost');
              setError('Stream connection lost');
            }
          }
        };
      } catch (err: any) {
        if (!aborted) {
          setError(err.message || 'Failed to connect to backend');
          addLog('system', 'error', `Error: ${err.message}`);
        }
      }
    }

    function handleEvent(event: any, id: string) {
      const { agent, status, data } = event;

      if (agent === 'planner') {
        if (status === 'running') {
          setAgent('planner', 'active');
          bumpProgress(5);
          addLog('planner', 'info', data.message || `Analyzing topic: "${topic}"...`);
        } else if (status === 'done') {
          setAgent('planner', 'done');
          bumpProgress(18);
          const elapsed = data.elapsed ? ` (${data.elapsed}s)` : '';
          addLog('planner', 'success', data.message || `Planned ${data.lessons} lessons${elapsed}`);
        }
      } else if (agent === 'creator') {
        if (status === 'running') {
          setAgent('creator', 'active');
          addLog('creator', 'info', data.message || `Writing Lesson ${(data.lesson ?? 0) + 1}${data.title ? `: ${data.title}` : ''}...`);
        } else if (status === 'done') {
          setAgent('creator', 'done');
          bumpProgress(Math.min(progressRef.current + 8, 45));
          const elapsed = data.elapsed ? ` (${data.elapsed}s)` : '';
          addLog('creator', 'success', data.message || `Lesson ${(data.lesson ?? 0) + 1} written${elapsed}`);
        }
      } else if (agent === 'validator') {
        if (status === 'running') {
          setAgent('validator', 'active');
          addLog('validator', 'info', data.message || `Validating code examples in lesson ${(data.lesson ?? 0) + 1}...`);
        } else if (status === 'progress') {
          addLog('validator', data.passed ? 'success' : 'error', data.message || `Snippet ${(data.snippet ?? 0) + 1}: ${data.passed ? 'PASS' : 'FAIL'}`);
        } else if (status === 'done') {
          const vs: string = data.status || 'pass';
          if (vs === 'fail') {
            setAgent('validator', 'failed');
            addLog('validator', 'error', `✗ Lesson ${(data.lesson ?? 0) + 1} — FAILED`);
          } else if (vs === 'fixed') {
            setAgent('validator', 'done');
            addLog('validator', 'fix', `↻ Lesson ${(data.lesson ?? 0) + 1} — FIXED`);
          } else {
            setAgent('validator', 'done');
            addLog('validator', 'success', `✓ Lesson ${(data.lesson ?? 0) + 1} — PASSED`);
          }
          bumpProgress(Math.min(progressRef.current + 8, 90));
        }
      } else if (agent === 'fixer') {
        if (status === 'running') {
          setAgent('fixer', 'active');
          setFeedbackLoops(l => l + 1);
          addLog('fixer', 'fix', data.message || `↻ Fixing ${data.failures || 1} failure(s) in lesson ${(data.lesson ?? 0) + 1}...`);
        } else if (status === 'done') {
          setAgent('fixer', 'done');
          const elapsed = data.elapsed ? ` (${data.elapsed}s)` : '';
          addLog('fixer', 'success', `✓ Fixed ${data.fixed || data.failures || 1} example(s)${elapsed}`);
        }
      } else if (agent === 'processing') {
        if (status === 'running') {
          addLog('system', 'info', data.message || 'Processing lessons...');
        } else if (status === 'lesson_done') {
          const elapsed = data.elapsed ? ` (${data.elapsed}s)` : '';
          addLog('system', 'success', data.message || `Lesson ${(data.lesson ?? 0) + 1} complete${elapsed}`);
          bumpProgress(Math.min(progressRef.current + 10, 90));
        } else if (status === 'error') {
          addLog('system', 'error', data.message || 'Processing error');
        }
      } else if (agent === 'orchestrator') {
        if (status === 'complete') {
          bumpProgress(100);
          setDone(true);
          const elapsed = data.elapsedSeconds ? ` in ${data.elapsedSeconds}s` : '';
          addLog('validator', 'success',
            `✓ Course complete — ${data.totalLessons} lessons, ${data.totalChecks || '?'} code checks, ${data.fixes || 0} fixes${elapsed}`
          );
          // Store stats for MonitorPage
          localStorage.setItem('lastCourseStats', JSON.stringify({
            totalLessons: data.totalLessons,
            totalChecks: data.totalChecks || 0,
            fixes: data.fixes || 0,
            elapsedSeconds: data.elapsedSeconds || 0,
          }));
          es?.close();
        } else if (status === 'error') {
          setError(data.message);
          addLog('planner', 'error', `Error: ${data.message}`);
          es?.close();
        }
      }
    }

    start();

    return () => {
      aborted = true;
      es?.close();
    };
  }, [topic, difficulty]);

  const logTypeStyle: Record<LogType | 'system', string> = {
    success: 'log-success',
    error: 'log-error',
    fix: 'log-fix',
    info: 'log-info',
    system: 'log-info',
  };

  const logPrefix: Record<LogType | 'system', string> = {
    success: '✓',
    error: '✗',
    fix: '↻',
    info: '·',
    system: '·',
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
          {done && courseId && (
            <button
              onClick={() => navigate(`/course?id=${courseId}`)}
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
            {error ? 'Error' : done ? 'Complete' : 'Processing...'}
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

        {error && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/15">
            <X className="w-3 h-3 text-red-400 shrink-0" />
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Live log */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-3">
          Live activity log
        </p>
        <div className="space-y-1.5 font-mono text-xs">
          {logs.map(log => {
            const type = (log.type as string) in logTypeStyle ? log.type as LogType : 'info';
            return (
              <div key={log.id} className={`flex items-start gap-2 animate-fade-up ${logTypeStyle[type]}`}>
                <span className="shrink-0 w-3 text-center mt-px">{logPrefix[type]}</span>
                <span className="text-muted-foreground shrink-0">[{log.agent}]</span>
                <span>{log.text}</span>
              </div>
            );
          })}
          {!done && !error && logs.length > 0 && (
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
                ✓ Course generation complete — {feedbackLoops} code fix{feedbackLoops !== 1 ? 'es' : ''} applied
              </p>
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
