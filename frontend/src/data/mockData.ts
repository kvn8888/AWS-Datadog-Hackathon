export type AgentId = 'planner' | 'creator' | 'validator' | 'fixer';
export type AgentStatus = 'idle' | 'active' | 'done' | 'failed';
export type LogType = 'info' | 'success' | 'error' | 'fix';

export interface CodeExample {
  id: number;
  title: string;
  language: string;
  code: string;
  output: string;
  validated: boolean;
  attempts: number;
  fixDescription?: string;
}

export interface Lesson {
  id: number;
  title: string;
  duration: string;
  narration: string[];
  codeExamples: CodeExample[];
}

export interface Course {
  id: string;
  topic: string;
  totalLessons: number;
  estimatedTime: string;
  lessons: Lesson[];
}

export interface MonitorStats {
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
}

export interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
}

export const exampleTopics = [
  'React Hooks',
  'Python for Data Science',
  'TypeScript Fundamentals',
  'Next.js App Router',
  'Rust Systems Programming',
  'SQL for Beginners',
];

export const mockCourse: Course = {
  id: 'react-hooks',
  topic: 'React Hooks',
  totalLessons: 6,
  estimatedTime: '42 min',
  lessons: [
    {
      id: 1,
      title: 'Introduction to React Hooks',
      duration: '6 min',
      narration: [
        'React Hooks were introduced in React 16.8 and fundamentally changed how we write React components.',
        'Before hooks, stateful logic could only live in class components. With hooks, function components can do everything a class can — and more.',
        "In this lesson we'll see our first hook and understand why hooks exist.",
      ],
      codeExamples: [
        {
          id: 1,
          title: 'Your first hook: useState',
          language: 'jsx',
          code: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
          output:
            '✓ Renders Counter component\n✓ useState initializes to 0\n✓ Button click increments count\n✓ Component re-renders on state change',
          validated: true,
          attempts: 1,
        },
      ],
    },
    {
      id: 2,
      title: 'useEffect and Side Effects',
      duration: '8 min',
      narration: [
        'useEffect lets you perform side effects in function components — fetching data, subscriptions, or manually changing the DOM.',
        'The effect runs after every render by default, but you control when it runs using the dependency array.',
        'Always return a cleanup function to avoid memory leaks.',
      ],
      codeExamples: [
        {
          id: 2,
          title: 'Syncing with the document title',
          language: 'jsx',
          code: `import { useState, useEffect } from 'react';

function TitleUpdater() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = \`Clicked \${count} times\`;
    return () => {
      document.title = 'React App';
    };
  }, [count]);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Click me ({count})
    </button>
  );
}`,
          output:
            '✓ Effect runs after render\n✓ Cleanup resets title on unmount\n✓ Dependency array [count] is correct\n✓ Functional updater c => c + 1 avoids stale closure',
          validated: true,
          attempts: 2,
          fixDescription: 'Added missing dependency [count] to dependency array',
        },
        {
          id: 3,
          title: 'Fetching data with useEffect',
          language: 'jsx',
          code: `import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(\`/api/users/\${userId}\`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  return <p>{user?.name}</p>;
}`,
          output:
            '✓ Cancellation pattern prevents stale state updates\n✓ Loading state handled correctly\n✓ Cleanup cancels in-flight requests\n✓ Optional chaining on user?.name is safe',
          validated: true,
          attempts: 1,
        },
      ],
    },
    {
      id: 3,
      title: 'useRef: Mutable Values & DOM Access',
      duration: '5 min',
      narration: [
        'useRef returns a mutable object whose .current property persists for the full lifetime of the component.',
        "Unlike state, changing a ref does not trigger a re-render — perfect for storing timers, previous values, or DOM references.",
      ],
      codeExamples: [
        {
          id: 4,
          title: 'Focusing an input with useRef',
          language: 'jsx',
          code: `import { useRef } from 'react';

function SearchBox() {
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current?.focus();
  }

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Search..." />
      <button onClick={handleClick}>Focus Input</button>
    </div>
  );
}`,
          output:
            '✓ useRef initializes to null\n✓ ref attached to DOM input element\n✓ Optional chaining on .current?.focus() is safe',
          validated: true,
          attempts: 1,
        },
      ],
    },
    {
      id: 4,
      title: 'useContext: Avoid Prop Drilling',
      duration: '7 min',
      narration: [
        'Context lets you pass data through the component tree without manually passing props at every level.',
        'Create a context, provide it at the top level, and consume it anywhere below with useContext.',
      ],
      codeExamples: [
        {
          id: 5,
          title: 'Theme context example',
          language: 'jsx',
          code: `import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext('light');

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <button
      style={{ background: theme === 'dark' ? '#333' : '#fff' }}
      onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
    >
      Toggle ({theme})
    </button>
  );
}`,
          output:
            '✓ Context created with default value\n✓ Provider supplies theme and setter\n✓ Consumer reads context without prop drilling\n✓ Toggle logic correctly alternates values',
          validated: true,
          attempts: 1,
        },
      ],
    },
    {
      id: 5,
      title: 'useReducer: Complex State Logic',
      duration: '8 min',
      narration: [
        'useReducer is an alternative to useState for managing complex state with multiple sub-values.',
        'It follows the Redux pattern: dispatch an action, a reducer handles it and returns new state.',
      ],
      codeExamples: [
        {
          id: 6,
          title: 'Shopping cart with useReducer',
          language: 'jsx',
          code: `import { useReducer } from 'react';

const initialState = { items: [], total: 0 };

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        items: [...state.items, action.item],
        total: state.total + action.item.price,
      };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

function Cart() {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  return (
    <div>
      <p>{cart.items.length} items — \${cart.total.toFixed(2)}</p>
      <button onClick={() => dispatch({
        type: 'ADD_ITEM',
        item: { name: 'Widget', price: 9.99 }
      })}>
        Add Widget
      </button>
      <button onClick={() => dispatch({ type: 'CLEAR' })}>
        Clear
      </button>
    </div>
  );
}`,
          output:
            '✓ Reducer handles ADD_ITEM and CLEAR\n✓ State immutably updated with spread operator\n✓ Default case returns state unchanged\n✓ total calculated correctly with price addition',
          validated: true,
          attempts: 1,
        },
      ],
    },
    {
      id: 6,
      title: 'Custom Hooks: Reusable Logic',
      duration: '8 min',
      narration: [
        'Custom hooks are the ultimate power of the hooks system — they let you extract component logic into reusable functions.',
        'A custom hook is just a function that starts with "use" and can call other hooks.',
        'This replaces render props and HOCs for sharing stateful logic between components.',
      ],
      codeExamples: [
        {
          id: 7,
          title: 'useLocalStorage hook',
          language: 'jsx',
          code: `import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write errors in restricted environments
    }
  }, [key, value]);

  return [value, setValue];
}

function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  return (
    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
      Theme: {theme}
    </button>
  );
}`,
          output:
            '✓ Lazy initializer reads from localStorage on mount\n✓ JSON parse/stringify handles serialization\n✓ try/catch handles restricted environments\n✓ Both key and value in useEffect dependencies',
          validated: true,
          attempts: 3,
          fixDescription:
            'Added missing "key" in useEffect deps; wrapped localStorage calls in try/catch for SSR safety',
        },
      ],
    },
  ],
};

export const monitorStats: MonitorStats = {
  cost: {
    total: 0.0847,
    planner: 0.0082,
    creator: 0.0463,
    validator: 0.0091,
    fixer: 0.0211,
  },
  accuracy: {
    firstPassRate: 71,
    totalExamples: 7,
    passedFirstTry: 5,
    requiredFixes: 2,
  },
  performance: {
    totalSeconds: 134,
    planningSeconds: 9,
    creationSeconds: 98,
    validationCycles: 9,
    avgFixSeconds: 3.8,
  },
};

export const initialChatMessages: ChatMessage[] = [
  {
    role: 'ai',
    content:
      'Your React Hooks course is ready — 6 lessons, 7 validated code examples. Ask me to adjust difficulty, add more examples, explain any concept, or rewrite a lesson.',
  },
];
