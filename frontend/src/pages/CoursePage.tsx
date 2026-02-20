import { useState, useRef, useEffect } from 'react';
import { Check, CheckCircle, ChevronLeft, ChevronRight, Play, Send, Wrench } from 'lucide-react';
import { mockCourse, initialChatMessages, type ChatMessage } from '@/data/mockData';

const suggestedEdits = [
  'Make this lesson more beginner-friendly',
  'Add another code example',
  'Explain this in simpler terms',
  'Add a quiz question',
];

function VideoPlayer({ title }: { title: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function togglePlay() {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(intervalRef.current!);
            setPlaying(false);
            return 100;
          }
          return p + 0.5;
        });
      }, 100);
    }
  }

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [title]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const elapsed = Math.floor((progress / 100) * 330);
  const total = '5:30';
  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-[#0a0a14]">
      {/* Video area */}
      <div
        className="relative aspect-video flex items-center justify-center cursor-pointer group"
        style={{ background: 'linear-gradient(135deg, #0f0f1e 0%, #14142a 50%, #0a0a14 100%)' }}
        onClick={togglePlay}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-xs font-mono mb-2 opacity-60">{title}</p>
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-all">
              {playing ? (
                <div className="flex gap-1">
                  <div className="w-1 h-5 bg-primary rounded-sm" />
                  <div className="w-1 h-5 bg-primary rounded-sm" />
                </div>
              ) : (
                <Play className="w-6 h-6 text-primary ml-1" />
              )}
            </div>
          </div>
        </div>
        {/* Simulated waveform */}
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-0.5 h-6 opacity-20">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-primary rounded-sm"
              style={{ height: `${20 + Math.sin(i * 0.4) * 15 + Math.random() * 20}%` }}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2.5 bg-card border-t border-border flex items-center gap-3">
        <button onClick={togglePlay} className="text-foreground hover:text-primary transition-colors">
          {playing ? (
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-current rounded-sm" />
              <div className="w-0.5 h-3 bg-current rounded-sm" />
            </div>
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>
        <span className="text-[10px] font-mono text-muted-foreground w-8">{elapsedStr}</span>
        <div
          className="flex-1 h-1 bg-muted rounded-full cursor-pointer"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setProgress(Math.max(0, Math.min(100, pct)));
          }}
        >
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{total}</span>
      </div>
    </div>
  );
}

function CodeBlock({ example }: { example: typeof mockCourse.lessons[0]['codeExamples'][0] }) {
  return (
    <div className={`rounded-lg overflow-hidden border ${example.validated ? 'border-validated/25' : 'border-failed/25'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{example.title}</span>
        <div className="flex items-center gap-3">
          {example.attempts > 1 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Wrench className="w-3 h-3" />
              Fixed in {example.attempts} attempts
            </span>
          )}
          <span
            className={`flex items-center gap-1 text-[10px] font-medium ${
              example.validated ? 'text-validated' : 'text-failed'
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            Validated
          </span>
        </div>
      </div>

      {/* Code */}
      <div className="p-4 bg-[#0a0a14] overflow-x-auto">
        <pre className="font-mono text-xs text-foreground/90 leading-relaxed whitespace-pre">
          {example.code}
        </pre>
      </div>

      {/* Output */}
      <div className="px-4 py-3 bg-card border-t border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 font-mono">
          Validation output
        </p>
        <pre className="font-mono text-[11px] text-validated leading-relaxed whitespace-pre">
          {example.output}
        </pre>
        {example.fixDescription && (
          <p className="mt-2 text-[10px] text-amber-400 flex items-start gap-1">
            <Wrench className="w-3 h-3 shrink-0 mt-px" />
            Fix applied: {example.fixDescription}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CoursePage() {
  const { lessons, topic } = mockCourse;
  const [activeLesson, setActiveLesson] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const lesson = lessons[activeLesson];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function sendMessage(text?: string) {
    const content = (text ?? chatInput).trim();
    if (!content) return;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const replies: Record<string, string> = {
        beginner: `I've simplified Lesson ${activeLesson + 1} — shorter code blocks, more inline comments, and a plain-English explanation before each example.`,
        example: `Added a new code example to Lesson ${activeLesson + 1}. The Code Validator ran it and it passed on the first attempt.`,
        simpler: `Rewrote the narration for Lesson ${activeLesson + 1} using simpler language and everyday analogies.`,
        quiz: `Added a quiz question at the end of Lesson ${activeLesson + 1}: "What happens if you omit the dependency array from useEffect?"`,
      };
      const key = Object.keys(replies).find(k => content.toLowerCase().includes(k));
      const reply = key
        ? replies[key]
        : `I've noted your request: "${content}". The Lesson Creator will update the course — the Code Validator will re-run any affected examples automatically.`;
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
    }, 1400);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — lesson list */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground truncate">{topic}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{lessons.length} lessons · 42 min</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {lessons.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setActiveLesson(i)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                i === activeLesson ? 'bg-primary/10 border-r-2 border-primary' : 'hover:bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  i < activeLesson
                    ? 'bg-green-500/10 border-green-500/40'
                    : i === activeLesson
                    ? 'bg-primary/15 border-primary/40'
                    : 'bg-muted border-border'
                }`}
              >
                {i < activeLesson ? (
                  <Check className="w-2.5 h-2.5 text-green-400" />
                ) : (
                  <span className="text-[8px] text-muted-foreground font-mono">{i + 1}</span>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs leading-tight font-medium truncate ${
                    i === activeLesson ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {l.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{l.duration}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {/* Lesson header */}
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-1">
              Lesson {lesson.id} of {lessons.length}
            </p>
            <h2 className="text-xl font-bold text-foreground">{lesson.title}</h2>
          </div>

          {/* Video player */}
          <div className="mb-6">
            <VideoPlayer title={lesson.title} />
          </div>

          {/* Narration */}
          <div className="mb-6 space-y-3">
            {lesson.narration.map((para, i) => (
              <p key={i} className="text-sm text-foreground/85 leading-relaxed">
                {para}
              </p>
            ))}
          </div>

          {/* Code examples */}
          <div className="space-y-4 mb-8">
            <p className="text-xs font-semibold text-foreground">
              Code Examples
              <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                All examples validated before publishing
              </span>
            </p>
            {lesson.codeExamples.map(ex => (
              <CodeBlock key={ex.id} example={ex} />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => setActiveLesson(Math.max(0, activeLesson - 1))}
              disabled={activeLesson === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs text-muted-foreground">
              {activeLesson + 1} / {lessons.length}
            </span>
            <button
              onClick={() => setActiveLesson(Math.min(lessons.length - 1, activeLesson + 1))}
              disabled={activeLesson === lessons.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — chat */}
      <div className="w-72 shrink-0 border-l border-border flex flex-col bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Edit this course</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ask the AI to change any lesson
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted px-3 py-2 rounded-lg rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions */}
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {suggestedEdits.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-2 py-1 rounded-md bg-muted hover:bg-accent text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 pb-4 border-t border-border pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask to edit..."
              className="flex-1 h-8 px-3 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
