/**
 * Module: ThemeToggle
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md
 *
 * Purpose: Light/dark toggle. Defaults to the OS's prefers-color-scheme; a
 *          manual choice is persisted to localStorage and wins over the system
 *          setting from then on. Toggling sets data-theme="dark"|"" on <html>,
 *          which swaps every CSS variable in globals.css instantly — no reload.
 */
'use client';

import { useEffect, useState } from 'react';
import { Icons } from '@/lib/icons';

const STORAGE_KEY = 'ishrize_web_theme';
type ThemeChoice = 'light' | 'dark';

function applyTheme(theme: ThemeChoice): void {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initial = stored ?? (mediaQuery.matches ? 'dark' : 'light');
    setTheme(initial);
    applyTheme(initial);

    // Only follow live system-preference changes when the user hasn't made an
    // explicit choice — a manual override always wins.
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

  // Icon depicts the CURRENTLY active theme (sun while light, moon while
  // dark) -- same convention the mobile app's theme menu item already uses.
  const Icon = theme === 'dark' ? Icons.moon : Icons.sun;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Dark theme' : 'Light theme'}
      className="rounded-md border border-[var(--border-default)] p-2 text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
    >
      <Icon size={18} />
    </button>
  );
}
