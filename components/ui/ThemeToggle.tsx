'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'ishrize_web_theme';
type ThemeChoice = 'light' | 'dark';

function applyTheme(theme: ThemeChoice): void {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
}

interface ThemeToggleProps {
  variant?: 'icon' | 'row';
  labelClassName?: string;
}

export function ThemeToggle({ variant = 'icon', labelClassName }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeChoice>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initial = stored ?? (mediaQuery.matches ? 'dark' : 'light');
    setTheme(initial);
    applyTheme(initial);

    if (stored) return;
    const handleChange = (e: MediaQueryListEvent): void => {
      const next: ThemeChoice = e.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  function toggle(): void {
    const next: ThemeChoice = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const Icon = theme === 'dark' ? Moon : Sun;
  const label = theme === 'dark' ? 'Dark theme' : 'Light theme';
  const ariaLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={ariaLabel}
        title={label}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Icon size={20} className="shrink-0" />
        <span className={labelClassName}>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      title={label}
      className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground"
    >
      <Icon size={18} />
    </button>
  );
}
