/**
 * Module: Clashes report page
 * Layer:  web-page (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 3); Phase 4
 *          of the cross-role fixes plan (type-coded rows + click-through fix)
 *
 * Purpose: List every clash the backend's Clash Detection Engine finds for the
 *          selected term — venue, host, and group conflicts — with enough detail
 *          to act on. The grid shows the same data inline via ClashBadge; this
 *          page is the dedicated report view.
 *
 *          Each row's type is accented (icon + colored label only, not a full
 *          card wash) so VENUE/HOST/GROUP are visually distinct at a glance
 *          without three different solid-red boxes. Clicking a row expands it
 *          inline -- the colliding bookings, a "Resolve automatically" button
 *          per booking (reuses the exact mutation Department Timetable's
 *          "Manage offerings" table already uses), and a link to Department
 *          Timetable for manual drag-and-drop when auto-resolve can't find a
 *          free slot. No second auto-reschedule/drag implementation here.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useScheduleSocket } from '@/hooks/useScheduleSocket';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { LiveSyncIndicator } from '@/components/ui/LiveSyncIndicator';
import { Icons, type IconProps } from '@/lib/icons';
import Link from 'next/link';
import type { Clash } from '@/types/scheduling';

const CLASH_LABEL: Record<Clash['type'], string> = {
  VENUE: 'Venue clash',
  HOST: 'Host clash',
  GROUP: 'Group clash',
};

const CLASH_COLOR_VAR: Record<Clash['type'], string> = {
  VENUE: '--fg-clash',
  HOST: '--fg-clash-host',
  GROUP: '--fg-clash-group',
};

const CLASH_ICON: Record<Clash['type'], (props: IconProps) => React.ReactElement> = {
  VENUE: Icons.clashVenue,
  HOST: Icons.clashHost,
  GROUP: Icons.clashGroup,
};

function ClashRow({
  clash,
  expanded,
  onToggle,
  onResolve,
  isResolving,
  resolveError,
}: {
  clash: Clash;
  expanded: boolean;
  onToggle: () => void;
  onResolve: (bookingId: string) => void;
  isResolving: boolean;
  resolveError: string | null;
}) {
  const who = clash.detail.venueName ?? clash.detail.hostName ?? clash.detail.groupName;
  const colorVar = `var(${CLASH_COLOR_VAR[clash.type]})`;
  const Icon = CLASH_ICON[clash.type];

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <Icon size={18} color={colorVar} className="shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: colorVar }}>
                {CLASH_LABEL[clash.type]}
              </span>
              {who && <span className="text-xs text-[var(--fg-muted)]">{who}</span>}
            </div>
            <p className="truncate text-sm text-[var(--fg-primary)]">{clash.detail.activityCodes.join(' vs ')}</p>
          </div>
        </div>
        <Icons.chevronRight
          size={18}
          color="var(--fg-muted)"
          className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-[var(--border-default)] px-4 py-3">
          {clash.detail.activityCodes.map((code, i) => {
            const bookingId = clash.bookingIds[i];
            if (!bookingId) return null;
            return (
              <div key={bookingId} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--fg-primary)]">{code}</span>
                <button
                  type="button"
                  onClick={() => onResolve(bookingId)}
                  disabled={isResolving}
                  className="rounded-md border border-[var(--border-default)] px-2.5 py-1 text-xs text-[var(--fg-primary)] hover:bg-[var(--bg-alternate)] disabled:opacity-60"
                >
                  Resolve automatically
                </button>
              </div>
            );
          })}
          {resolveError && <p className="text-xs text-[var(--fg-clash)]">{resolveError}</p>}
          <Link href="/department-timetable?from=clashes" className="inline-block text-xs text-[var(--accent-primary)] hover:underline">
            Open Department Timetable to resolve manually →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ClashesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { termId } = useScheduleSelectionStore();
  const queryClient = useQueryClient();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  // Live: re-runs clash detection the moment any client changes a booking
  // in this term, so the report never goes stale behind another user's edit.
  const { connected } = useScheduleSocket(termId);

  const clashesQuery = useQuery({
    queryKey: ['clashes', termId],
    queryFn: () => schedulingApi.getClashes(termId),
    enabled: !!termId,
  });

  const resolveMutation = useMutation({
    mutationFn: (bookingId: string) => schedulingApi.autoRescheduleBooking(bookingId),
    onSuccess: () => {
      setResolveError(null);
      queryClient.invalidateQueries({ queryKey: ['clashes', termId] });
    },
    onError: (err) => setResolveError(err instanceof Error ? err.message : 'Could not auto-resolve this clash'),
  });

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      </main>
    );
  }

  const clashes = clashesQuery.data ?? [];

  return (
    <AppShell>
      <AppHeader title="Clash Report" endSlot={<LiveSyncIndicator connected={connected} />} />

      {clashesQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Checking for clashes…</p>
      ) : clashesQuery.isError ? (
        <p className="text-sm text-[var(--fg-clash)]">Failed to load clashes.</p>
      ) : clashes.length === 0 ? (
        <p className="text-sm text-[var(--fg-free-slot)]">No clashes for this term.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clashes.map((clash, i) => {
            const key = `${clash.type}-${clash.timeSlotId}-${i}`;
            return (
              <ClashRow
                key={key}
                clash={clash}
                expanded={expandedKey === key}
                onToggle={() => {
                  setExpandedKey(expandedKey === key ? null : key);
                  setResolveError(null);
                }}
                onResolve={(bookingId) => resolveMutation.mutate(bookingId)}
                isResolving={resolveMutation.isPending}
                resolveError={expandedKey === key ? resolveError : null}
              />
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
