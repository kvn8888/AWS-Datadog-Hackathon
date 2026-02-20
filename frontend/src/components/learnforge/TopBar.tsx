import { Zap, BarChart3, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Generate', path: '/generate', icon: Zap },
    { label: 'My Course', path: '/course', icon: BookOpen },
    { label: 'Monitor', path: '/monitor', icon: BarChart3 },
  ];

  return (
    <header className="h-14 border-b border-border flex items-center px-6 gap-6 bg-card shrink-0">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 shrink-0"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-sm text-foreground tracking-tight">
          LearnForge
        </span>
      </button>

      <div className="w-px h-5 bg-border" />

      <nav className="flex items-center gap-1">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path || (path === '/generate' && location.pathname === '/');
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
          All agents online
        </div>
      </div>
    </header>
  );
}
