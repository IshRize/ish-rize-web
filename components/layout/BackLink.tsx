/**
 * Module: BackLink
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md; Phase 6a of the cross-role fixes plan
 *
 * Purpose: A page reached by drilling in from somewhere else (e.g. Clashes'
 *          "Open Department Timetable to resolve manually" link) should show
 *          a clear way back, instead of relying on the browser's own back
 *          button being the only path home. Deliberately just a single link,
 *          not a persistent breadcrumb trail on every page -- this solves
 *          "how do I get back to where I came from," nothing more.
 *
 *          The originating page passes `?from=<key>` on its link; this reads
 *          that key and renders nothing at all when it's absent or unknown,
 *          so a normal (non-drill-in) page visit is unaffected. Add an entry
 *          here for each new drill-in flow rather than hardcoding a one-off
 *          link on the destination page.
 */
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const FROM_TARGETS: Record<string, { href: string; label: string }> = {
  clashes: { href: '/clashes', label: 'Back to clash report' },
};

export function BackLink() {
  const params = useSearchParams();
  const from = params.get('from');
  const target = from ? FROM_TARGETS[from] : undefined;
  if (!target) return null;
  return (
    <Link
      href={target.href}
      className="mb-3 inline-flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
    >
      ← {target.label}
    </Link>
  );
}
