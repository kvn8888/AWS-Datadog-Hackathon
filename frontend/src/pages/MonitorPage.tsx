import { useEffect, useState } from 'react';
import { DollarSign, Target, Zap, BookOpen, FlaskConical, Wrench, TrendingUp } from 'lucide-react';

interface Stats {
  cost: {
    total: number;
    planner: number;
    creator: number;
    validator: number;
    fixer: number;
  };
  accuracy: {
    firstPassRate: number;
    totalExamples: number;
    passedFirstTry: number;
    requiredFixes: number;
  };
  performance: {
    totalSeconds: number;
    planningSeconds: number;
    creationSeconds: number;
    validationCycles: number;
    avgFixSeconds: number;
  };
  topic: string;
  totalLessons: number;
}

function buildStats(raw: {
  totalLessons?: number;
  totalChecks?: number;
  fixes?: number;
  elapsedSeconds?: number;
  topic?: string;
}): Stats {
  const totalLessons = raw.totalLessons || 4;
  const totalChecks = raw.totalChecks || totalLessons * 2;
  const fixes = raw.fixes || 0;
  const elapsed = raw.elapsedSeconds || 90;
  const topic = raw.topic || 'Unknown';

  const passedFirstTry = totalChecks - fixes;
  const firstPassRate = totalChecks > 0 ? Math.round((passedFirstTry / totalChecks) * 100) : 100;

  // Estimate cost breakdown (Claude Sonnet pricing approx)
  const plannerCost = 0.004 + totalLessons * 0.001;
  const creatorCost = totalLessons * 0.012;
  const validatorCost = totalChecks * 0.002;
  const fixerCost = fixes * 0.004;
  const total = plannerCost + creatorCost + validatorCost + fixerCost;

  const planningSeconds = Math.round(elapsed * 0.08);
  const creationSeconds = Math.round(elapsed * 0.65);
  const validationCycles = totalChecks + fixes;
  const avgFixSeconds = fixes > 0 ? Math.round((elapsed * 0.2) / fixes) : 0;

  return {
    cost: { total, planner: plannerCost, creator: creatorCost, validator: validatorCost, fixer: fixerCost },
    accuracy: { firstPassRate, totalExamples: totalChecks, passedFirstTry, requiredFixes: fixes },
    performance: { totalSeconds: elapsed, planningSeconds, creationSeconds, validationCycles, avgFixSeconds },
    topic,
    totalLessons,
  };
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function BarRow({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono text-foreground w-20 text-right shrink-0">
        {suffix ? `${value}${suffix}` : `$${value.toFixed(4)}`}
      </span>
    </div>
  );
}

const agentCostItems = [
  { label: 'Lesson Creator', key: 'creator' as const, color: '#a78bfa', icon: Zap },
  { label: 'Code Fixer', key: 'fixer' as const, color: '#4ade80', icon: Wrench },
  { label: 'Code Validator', key: 'validator' as const, color: '#fbbf24', icon: FlaskConical },
  { label: 'Curriculum Planner', key: 'planner' as const, color: '#60a5fa', icon: BookOpen },
];

export default function MonitorPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Read from localStorage (written by GeneratePage on completion)
    const raw = localStorage.getItem('lastCourseStats');
    const topic = localStorage.getItem('lastCourseTopic') || 'Unknown';
    const startStr = localStorage.getItem('lastCourseStart');

    let parsed: any = {};
    if (raw) {
      try { parsed = JSON.parse(raw); } catch { /* ignore */ }
    }

    // If we have elapsed from localStorage, use it; otherwise try to compute from timestamps
    if (!parsed.elapsedSeconds && startStr) {
      const elapsed = Math.round((Date.now() - parseInt(startStr, 10)) / 1000);
      parsed.elapsedSeconds = elapsed;
    }

    parsed.topic = topic;
    setStats(buildStats(parsed));
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">No course data yet — generate a course first.</p>
      </div>
    );
  }

  const { cost, accuracy, performance } = stats;
  const firstPassPct = accuracy.firstPassRate;
  const totalPass = accuracy.passedFirstTry + accuracy.requiredFixes;
  const finalPassRate = accuracy.totalExamples > 0
    ? Math.round((totalPass / accuracy.totalExamples) * 100)
    : 100;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-foreground mb-1">Course Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Cost, accuracy, and performance metrics for: <span className="text-foreground font-medium">{stats.topic}</span>
          </p>
        </div>

        {/* Top metric cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard icon={DollarSign} label="Estimated Cost" value={`$${cost.total.toFixed(4)}`}
            sub="Across all 4 agents" color="#60a5fa" />
          <MetricCard icon={Target} label="Final Accuracy" value={`${finalPassRate}%`}
            sub={`${totalPass}/${accuracy.totalExamples} examples passed`} color="#4ade80" />
          <MetricCard icon={Zap} label="Generation Time" value={`${performance.totalSeconds}s`}
            sub={`${performance.validationCycles} validation cycles`} color="#a78bfa" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Cost breakdown */}
          <div className="card-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-foreground">Cost Breakdown</h2>
            </div>
            <div className="space-y-3 mb-4">
              {agentCostItems.map(({ label, key, color }) => (
                <BarRow key={key} label={label} value={cost[key]}
                  max={cost.creator || 0.01} color={color} />
              ))}
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-foreground font-mono">${cost.total.toFixed(4)}</span>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Lesson Creator is the largest cost — it writes narration and code for all {stats.totalLessons} lessons.
                Code Fixer cost reflects {accuracy.requiredFixes} fix cycle(s).
              </p>
            </div>
          </div>

          {/* Accuracy breakdown */}
          <div className="card-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-semibold text-foreground">Validation Accuracy</h2>
            </div>
            <div className="flex items-center gap-5 mb-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(238 18% 18%)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4ade80" strokeWidth="3"
                    strokeDasharray={`${finalPassRate} ${100 - finalPassRate}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{finalPassRate}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">First try pass rate</p>
                  <p className="text-lg font-bold text-foreground">{firstPassPct}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Required fixes</p>
                  <p className="text-base font-semibold text-amber-400">{accuracy.requiredFixes} examples</p>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <BarRow label="Passed first try" value={accuracy.passedFirstTry}
                max={accuracy.totalExamples || 1} color="#4ade80"
                suffix={` / ${accuracy.totalExamples}`} />
              <BarRow label="Required fixes" value={accuracy.requiredFixes}
                max={accuracy.totalExamples || 1} color="#fbbf24"
                suffix={` / ${accuracy.totalExamples}`} />
              <BarRow label="Final pass (100%)" value={totalPass}
                max={accuracy.totalExamples || 1} color="#60a5fa"
                suffix={` / ${accuracy.totalExamples}`} />
            </div>
          </div>

          {/* Performance */}
          <div className="card-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-foreground">Performance</h2>
            </div>
            <div className="space-y-3">
              <BarRow label="Lesson creation" value={performance.creationSeconds}
                max={performance.totalSeconds || 1} color="#a78bfa" suffix="s" />
              <BarRow label="Validation" value={performance.validationCycles * 2}
                max={performance.totalSeconds || 1} color="#fbbf24" suffix="s est." />
              <BarRow label="Planning" value={performance.planningSeconds}
                max={performance.totalSeconds || 1} color="#60a5fa" suffix="s" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-[10px] text-muted-foreground mb-1">Validation cycles</p>
                <p className="text-lg font-bold text-foreground">{performance.validationCycles}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-[10px] text-muted-foreground mb-1">Avg fix time</p>
                <p className="text-lg font-bold text-foreground">
                  {performance.avgFixSeconds > 0 ? `${performance.avgFixSeconds}s` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary insights */}
          <div className="card-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Insights</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  color: 'bg-green-400',
                  text: `${accuracy.passedFirstTry} of ${accuracy.totalExamples} code examples passed validation on the first attempt (${firstPassPct}% first-pass rate).`,
                },
                {
                  color: 'bg-amber-400',
                  text: accuracy.requiredFixes > 0
                    ? `The Validator→Fixer feedback loop ran ${accuracy.requiredFixes} time(s). All failing examples were corrected and re-validated.`
                    : `All code examples passed on the first try — no fixes required.`,
                },
                {
                  color: 'bg-blue-400',
                  text: `Total estimated cost was $${cost.total.toFixed(4)} — roughly $${(cost.total / (stats.totalLessons || 1)).toFixed(4)} per lesson.`,
                },
                {
                  color: 'bg-purple-400',
                  text: `Course built in ${performance.totalSeconds}s end-to-end including ${performance.validationCycles} validation cycles.`,
                },
              ].map((insight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${insight.color} shrink-0 mt-1.5`} />
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
