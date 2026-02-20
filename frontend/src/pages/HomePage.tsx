import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, BookOpen, FlaskConical, Wrench, ArrowRight, CheckCircle } from 'lucide-react';
import { exampleTopics } from '@/data/mockData';

const agents = [
  {
    icon: BookOpen,
    name: 'Curriculum Planner',
    description: 'Designs lesson structure, learning objectives, and pacing for your topic.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    icon: Zap,
    name: 'Lesson Creator',
    description: 'Writes narration, visuals descriptions, and working code examples for every lesson.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
  },
  {
    icon: FlaskConical,
    name: 'Code Validator',
    description: 'Actually runs every code snippet and checks the output before you ever see it.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    icon: Wrench,
    name: 'Code Fixer',
    description: 'Rewrites any code that fails, then sends it back to the validator — until it passes.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
  },
];

const guarantees = [
  'Every code example is executed before you see it',
  'Broken code is automatically fixed and re-tested',
  'Edit any lesson through a chat interface',
  'Full cost and accuracy monitoring included',
];

export default function HomePage() {
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();

  function handleGenerate(t?: string) {
    const value = (t ?? topic).trim();
    if (!value) return;
    navigate(`/generate?topic=${encodeURIComponent(value)}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium mb-8 animate-fade-up">
          <FlaskConical className="w-3.5 h-3.5" />
          Every code example is tested before you see it
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-4 animate-fade-up delay-1">
          <span className="gradient-text">AI-powered courses</span>
          <br />
          <span className="text-foreground">with guaranteed code</span>
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl mb-10 animate-fade-up delay-2">
          Type a topic. Four AI agents collaborate to build your course — and every code
          example is validated and fixed before you ever see it.
        </p>

        {/* Input */}
        <div className="w-full max-w-xl animate-fade-up delay-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="What do you want to learn? e.g. React Hooks"
              className="flex-1 h-12 px-4 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!topic.trim()}
              className="h-12 px-5 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all glow-primary"
            >
              Generate
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Topic chips */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {exampleTopics.map(t => (
              <button
                key={t}
                onClick={() => handleGenerate(t)}
                className="px-3 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Guarantees */}
        <ul className="mt-8 flex flex-col gap-1.5 animate-fade-up delay-4">
          {guarantees.map(g => (
            <li key={g} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">How LearnForge works</h2>
          <p className="text-sm text-muted-foreground">Four specialized agents, one feedback loop</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, i) => (
            <div key={agent.name} className={`card-surface p-5 animate-fade-up`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${agent.bg} border ${agent.border} flex items-center justify-center`}>
                  <agent.icon className={`w-4 h-4 ${agent.color}`} />
                </div>
                <span className={`text-[10px] font-mono font-medium ${agent.color}`}>
                  Agent {i + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{agent.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
            </div>
          ))}
        </div>

        {/* Feedback loop callout */}
        <div className="mt-4 card-surface p-4 flex items-start gap-3 border-primary/20">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-0.5">The feedback loop</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When the Code Validator catches a broken example, it triggers the Code Fixer. The fixer
              rewrites the code and hands it back to the validator. This loop repeats until every
              example passes — then you see the course.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
