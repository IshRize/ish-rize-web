/**
 * Module: ClashBadge
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 3)
 *
 * Purpose: Small overlay marker on a grid cell whose booking appears in the
 *          clash report. One booking can be involved in more than one clash
 *          (e.g. both a VENUE and a GROUP clash); the badge summarizes all of them.
 */
import type { Clash } from '@/types/scheduling';

const CLASH_LABEL: Record<Clash['type'], string> = {
  VENUE: 'Venue clash',
  HOST: 'Host clash',
  GROUP: 'Group clash',
};

interface ClashBadgeProps {
  clashes: Clash[];
}

function describeClash(clash: Clash): string {
  const who = clash.detail.venueName ?? clash.detail.hostName ?? clash.detail.groupName ?? '';
  const codes = clash.detail.activityCodes.join(' vs ');
  return `${CLASH_LABEL[clash.type]}${who ? ` — ${who}` : ''}: ${codes}`;
}

export function ClashBadge({ clashes }: ClashBadgeProps) {
  if (clashes.length === 0) return null;
  const title = clashes.map(describeClash).join('\n');
  return (
    <span
      title={title}
      className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--fg-clash)] text-[10px] font-bold text-[var(--fg-on-accent-primary)]"
      aria-label={title}
    >
      !
    </span>
  );
}
