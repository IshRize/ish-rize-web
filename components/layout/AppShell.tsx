/**
 * Module: AppShell
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 2
 *
 * Purpose: Thin layout wrapper every authenticated page uses: sidebar on the
 *          left, page content on the right. Replaces the old pattern where
 *          each page rendered a bare <main> with AppHeader's nav bar inside it.
 */
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
