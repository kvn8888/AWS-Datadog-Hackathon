import { useState, useRef, useEffect } from 'react';
import { Check, CheckCircle, ChevronLeft, ChevronRight, Play, Send, Wrench, AlertCircle, Volume2, Image as ImageIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { initialChatMessages, type ChatMessage } from '@/data/mockData';

const BACKEND_URL = 'http://localhost:8000';

// Backend schema types
interface BackendCodeExample {
  language: string;
  code: string;
  original_code?: string | null;
  validation_status: 'pass' | 'fixed' | 'fail' | 'pending';
}

interface BackendLesson {
  title: string;
  objectives: string[];
  explanation: string;
  code_examples: BackendCodeExample[];
  quiz_questions: { question: string; options: string[]; correct_index: number }[];
  audio_url: string | null;
  image_url: string | null;
  validation_status: 'pass' | 'fixed' | 'fail' | 'pending';
}

interface BackendCourse {
  id: string;
  topic: string;
  difficulty: string;
  lessons: BackendLesson[];
  status: string;
}

const suggestedEdits = [
  'Make this lesson more beginner-friendly',
  'Add another code example',
  'Explain this in simpler terms',
  'Add a quiz question',
];

function AudioPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  function togglePlay() {
    if (!audioRef.current) return;
    if (audioError) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          setAudioError(null);
          setPlaying(true);
        }).catch(() => {
          setPlaying(false);
          setAudioError('This audio source is not playable in your browser.');
        });
      } else {
        setPlaying(true);
      }
    }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-[#0a0a14]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const duration = audioRef.current.duration;
            const current = audioRef.current.currentTime;
            if (Number.isFinite(duration) && duration > 0 && Number.isFinite(current)) {
              setProgress((current / duration) * 100);
            } else {
              setProgress(0);
            }
          }
        }}
        onError={() => {
          setPlaying(false);
          setAudioError('Audio failed to load. Try generating it again.');
        }}
        onEnded={() => setPlaying(false)}
      />
      <div className="px-4 py-3 flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-primary shrink-0" />
        <button onClick={togglePlay} className="text-foreground hover:text-primary transition-colors shrink-0">
          {playing ? (
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-current rounded-sm" />
              <div className="w-0.5 h-3 bg-current rounded-sm" />
            </div>
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>
        <div
          className="flex-1 h-1 bg-muted rounded-full cursor-pointer"
          onClick={e => {
            if (!audioRef.current || audioError) return;
            const rect = e.currentTarget.getBoundingClientRect();
            if (!Number.isFinite(rect.width) || rect.width <= 0) return;

            const pctRaw = (e.clientX - rect.left) / rect.width;
            if (!Number.isFinite(pctRaw)) return;

            const pct = Math.min(1, Math.max(0, pctRaw));
            const duration = audioRef.current.duration;
            if (!Number.isFinite(duration) || duration <= 0) return;

            const target = pct * duration;
            if (!Number.isFinite(target)) return;
            audioRef.current.currentTime = target;
          }}
        >
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{title}</span>
      </div>
      {audioError && (
        <div className="px-4 pb-3 text-[10px] text-red-400">{audioError}</div>
      )}
    </div>
  );
}

function GenerateImageButton({
  courseId,
  lessonIndex,
  lessonTitle,
  explanation,
  onImageReady,
}: {
  courseId: string;
  lessonIndex: number;
  lessonTitle: string;
  explanation: string;
  onImageReady: (url: string) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/course/${courseId}/lesson/${lessonIndex}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a clean technical concept diagram for ${lessonTitle}. Context: ${explanation.slice(0, 700)}`,
          aspect_ratio: '16:9',
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const imageUrl = typeof data.image_url === 'string' ? data.image_url : '';
      const isRenderable = imageUrl.startsWith('http') || imageUrl.startsWith('data:image/');
      if (imageUrl && isRenderable) {
        onImageReady(imageUrl);
      } else {
        throw new Error('Image generated but no renderable URL returned');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="w-full rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors px-4 py-3 flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <ImageIcon className="w-4 h-4 text-primary shrink-0" />
      {generating ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-xs text-muted-foreground">Generating concept image…</span>
        </>
      ) : error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Generate concept image</span>
          <span className="ml-1.5">— on demand</span>
        </span>
      )}
    </button>
  );
}

function ListenButton({
  courseId,
  lessonIndex,
  lessonTitle,
  explanation,
  onAudioReady,
}: {
  courseId: string;
  lessonIndex: number;
  lessonTitle: string;
  explanation: string;
  onAudioReady: (url: string) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/course/${courseId}/lesson/${lessonIndex}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: explanation.slice(0, 5000) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const audioUrl = typeof data.audio_url === 'string' ? data.audio_url : '';
      const isPlayable = audioUrl.startsWith('http') || audioUrl.startsWith('data:audio/');
      if (audioUrl && isPlayable) {
        onAudioReady(audioUrl);
      } else {
        throw new Error('Audio generated but no playable URL returned');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate audio');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="w-full rounded-lg border border-border bg-[#0a0a14] hover:bg-muted/30 transition-colors px-4 py-3 flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Volume2 className="w-4 h-4 text-primary shrink-0" />
      {generating ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-xs text-muted-foreground">Generating audio for "{lessonTitle}"…</span>
        </>
      ) : error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Listen to this lesson</span>
          <span className="ml-1.5">— generate audio narration</span>
        </span>
      )}
    </button>
  );
}

function FakeAudioPlayer({ title }: { title: string }) {
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

  const elapsed = Math.floor((progress / 100) * 180);
  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-[#0a0a14]">
      <div className="relative aspect-video flex items-center justify-center cursor-pointer group"
        style={{ background: 'linear-gradient(135deg, #0f0f1e 0%, #14142a 50%, #0a0a14 100%)' }}
        onClick={togglePlay}
      >
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
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-0.5 h-6 opacity-20">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="flex-1 bg-primary rounded-sm"
              style={{ height: `${20 + Math.sin(i * 0.4) * 15 + Math.random() * 20}%` }} />
          ))}
        </div>
      </div>
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
        <div className="flex-1 h-1 bg-muted rounded-full cursor-pointer"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            setProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
          }}
        >
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">3:00</span>
      </div>
    </div>
  );
}

function ValidationBadge({ status }: { status: string }) {
  if (status === 'pass') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-green-400">
        <CheckCircle className="w-3 h-3" /> PASS
      </span>
    );
  }
  if (status === 'fixed') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
        <Wrench className="w-3 h-3" /> FIXED
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-red-400">
      <AlertCircle className="w-3 h-3" /> FAIL
    </span>
  );
}

function CodeBlock({ example }: { example: BackendCodeExample }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{example.language}</span>
        <div className="flex items-center gap-2">
          {example.validation_status === 'fixed' && example.original_code && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Wrench className="w-3 h-3" /> Auto-fixed by AI
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-green-400/70">
            <CheckCircle className="w-3 h-3" /> Verified
          </span>
        </div>
      </div>

      {/* Show before/after if code was auto-fixed */}
      {example.validation_status === 'fixed' && example.original_code && (
        <details className="border-b border-border">
          <summary className="px-4 py-2 text-[10px] text-amber-400/70 font-mono cursor-pointer hover:bg-amber-400/5">
            View original code (before fix)
          </summary>
          <div className="p-4 bg-red-950/10">
            <pre className="font-mono text-xs text-red-300/50 leading-relaxed whitespace-pre overflow-x-auto">
              {example.original_code}
            </pre>
          </div>
        </details>
      )}

      <div className="p-4 bg-[#0a0a14] overflow-x-auto">
        <pre className="font-mono text-xs text-foreground/90 leading-relaxed whitespace-pre">
          {example.code}
        </pre>
      </div>
    </div>
  );
}

export default function CoursePage() {
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('id') || localStorage.getItem('lastCourseId');

  const [course, setCourse] = useState<BackendCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!courseIdFromUrl) {
      setLoading(false);
      return;
    }
    fetch(`${BACKEND_URL}/course/${courseIdFromUrl}`)
      .then(r => {
        if (!r.ok) throw new Error(`Backend returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!data.lessons || !data.lessons.length) throw new Error('No lessons in course');
        setCourse(data);
        setMessages([{
          role: 'ai',
          content: `Your course on "${data.topic}" is ready — ${data.lessons.length} lessons, all code validated. Ask me to adjust any lesson.`,
        }]);
      })
      .catch(() => {
        // Fall through to show loading error
      })
      .finally(() => setLoading(false));
  }, [courseIdFromUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function sendMessage(text?: string) {
    const content = (text ?? chatInput).trim();
    if (!content || !course || !course.lessons?.length || isPending) return;
    const currentLesson = course.lessons[activeLesson] ?? course.lessons[0];
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsTyping(true);
    setIsPending(true);
    if (text) setUsedChips(prev => new Set(prev).add(text));

    // Call real regenerate endpoint
    fetch(`${BACKEND_URL}/course/${course.id}/lesson/${activeLesson}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: content }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `Got it — the pipeline is regenerating Lesson ${activeLesson + 1} ("${currentLesson.title}"). I'll update the page when it's done.`,
        }]);
        // Poll for the updated course
        const pollInterval = setInterval(() => {
          fetch(`${BACKEND_URL}/course/${course.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.lessons?.length) {
                setCourse(data);
                setIsPending(false);
                clearInterval(pollInterval);
                setMessages(prev => [...prev, {
                  role: 'ai',
                  content: `Done! Lesson ${activeLesson + 1} has been updated. Take a look.`,
                }]);
              }
            })
            .catch(() => {});
        }, 10000);
        // Stop polling after 2 min
        setTimeout(() => { clearInterval(pollInterval); setIsPending(false); }, 120000);
      })
      .catch(() => {
        setIsTyping(false);
        setIsPending(false);
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `Sorry, I couldn't regenerate that lesson right now. The pipeline may be busy — try again in a moment.`,
        }]);
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course || !course.lessons || course.lessons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">No course found</p>
          <p className="text-xs text-muted-foreground">Generate a course first from the home page.</p>
        </div>
      </div>
    );
  }

  const lessons = course.lessons;
  const lesson = lessons[activeLesson] ?? lessons[0];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — lesson list */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground truncate">{course.topic}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{lessons.length} lessons · {course.difficulty}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {lessons.map((l, i) => (
            <button
              key={i}
              onClick={() => setActiveLesson(i)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${
                i === activeLesson ? 'bg-primary/10 border-r-2 border-primary' : 'hover:bg-muted'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                i === activeLesson
                  ? 'bg-primary/15 border-primary/40'
                  : 'bg-muted border-border'
              }`}>
                <span className={`text-[8px] font-mono ${
                  i === activeLesson ? 'text-primary' : 'text-muted-foreground'
                }`}>{i + 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs leading-tight font-medium truncate ${
                  i === activeLesson ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {l.title}
                </p>
                <div className="mt-0.5">
                  {l.validation_status === 'pass' && (
                    <span className="text-[9px] text-green-400 font-mono">PASS</span>
                  )}
                  {l.validation_status === 'fixed' && (
                    <span className="text-[9px] text-amber-400 font-mono">FIXED</span>
                  )}
                  {l.validation_status === 'fail' && (
                    <span className="text-[9px] text-red-400 font-mono">FAIL</span>
                  )}
                </div>
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
              Lesson {activeLesson + 1} of {lessons.length}
            </p>
            <h2 className="text-xl font-bold text-foreground">{lesson.title}</h2>
            {lesson.objectives.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {lesson.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                    {obj}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Audio — on-demand TTS generation */}
          <div className="mb-6">
            {lesson.audio_url ? (
              <AudioPlayer audioUrl={lesson.audio_url} title={lesson.title} />
            ) : (
              <ListenButton
                courseId={course.id}
                lessonIndex={activeLesson}
                lessonTitle={lesson.title}
                explanation={lesson.explanation}
                onAudioReady={(url) => {
                  const updated = { ...course };
                  updated.lessons = [...course.lessons];
                  updated.lessons[activeLesson] = { ...lesson, audio_url: url };
                  setCourse(updated as BackendCourse);
                }}
              />
            )}
          </div>

          {/* Concept image — on-demand generation */}
          <div className="mb-6">
            {lesson.image_url ? (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={lesson.image_url}
                  alt={`Concept diagram for ${lesson.title}`}
                  className="w-full object-cover"
                />
                <p className="px-4 py-2 text-[10px] text-muted-foreground bg-card border-t border-border">
                  Concept visual
                </p>
              </div>
            ) : (
              <GenerateImageButton
                courseId={course.id}
                lessonIndex={activeLesson}
                lessonTitle={lesson.title}
                explanation={lesson.explanation}
                onImageReady={(url) => {
                  const updated = { ...course };
                  updated.lessons = [...course.lessons];
                  updated.lessons[activeLesson] = { ...lesson, image_url: url };
                  setCourse(updated as BackendCourse);
                }}
              />
            )}
          </div>

          {/* Explanation */}
          <div className="mb-6">
            {lesson.explanation.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="text-sm text-foreground/85 leading-relaxed mb-3">
                {para}
              </p>
            ))}
          </div>

          {/* Code examples */}
          {lesson.code_examples.length > 0 && (
            <div className="space-y-4 mb-8">
              <p className="text-xs font-semibold text-foreground">
                Code Examples
              </p>
              {lesson.code_examples.map((ex, i) => (
                <CodeBlock key={i} example={ex} />
              ))}
            </div>
          )}

          {/* Quiz */}
          {lesson.quiz_questions.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-foreground mb-3">Quiz</p>
              <div className="space-y-4">
                {lesson.quiz_questions.map((q, qi) => {
                  const qKey = `${activeLesson}-${qi}`;
                  const selected = quizAnswers[qKey];
                  const answered = selected !== undefined;
                  const isCorrect = selected === q.correct_index;
                  return (
                    <div key={qi} className="p-4 rounded-lg bg-card border border-border">
                      <p className="text-sm font-medium text-foreground mb-3">{q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          let style = 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer';
                          if (answered) {
                            if (oi === q.correct_index) {
                              style = 'bg-green-400/10 border border-green-400/20 text-green-300';
                            } else if (oi === selected && !isCorrect) {
                              style = 'bg-red-400/10 border border-red-400/20 text-red-300';
                            } else {
                              style = 'bg-muted text-muted-foreground/50';
                            }
                          }
                          return (
                            <button
                              key={oi}
                              onClick={() => !answered && setQuizAnswers(prev => ({ ...prev, [qKey]: oi }))}
                              disabled={answered}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${style}`}
                            >
                              <span className="font-mono">
                                {answered && oi === q.correct_index ? '✓' : answered && oi === selected && !isCorrect ? '✗' : '○'}
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <p className={`mt-2 text-[10px] font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {isCorrect ? '✓ Correct!' : `✗ Incorrect — the answer is: ${q.options[q.correct_index]}`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
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

        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {suggestedEdits.filter(s => !usedChips.has(s)).map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={isPending}
              className="px-2 py-1 rounded-md bg-muted hover:bg-accent text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>

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
              disabled={!chatInput.trim() || isPending}
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
