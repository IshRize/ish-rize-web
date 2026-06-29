/**
 * Module: TeachingLoadTab
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; Coordinator Hub Phase 3
 *
 * Purpose: The Coordinator Hub's "Teaching Load" tab -- absorbed from the
 *          former standalone /teaching-load page (now deleted). Reuses the
 *          hub's own department picker, so unlike the original page this
 *          needs no Department selector of its own; Term comes from
 *          AppHeader's always-rendered Term select via the shared
 *          scheduleSelectionStore, also with no selector of its own here.
 *          "Scheduled hours" is a proxy for time on campus, not real
 *          swipe-based attendance.
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { schedulingApi } from '@/lib/api';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { useScheduleSocket } from '@/hooks/useScheduleSocket';

interface TeachingLoadTabProps {
  orgUnitId: string;
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function TeachingLoadTab({ orgUnitId }: TeachingLoadTabProps) {
  const { termId } = useScheduleSelectionStore();
  // Live: scheduled hours recompute when any booking in this term changes.
  useScheduleSocket(termId);

  const loadQuery = useQuery({
    queryKey: ['teaching-load', termId, orgUnitId],
    queryFn: () => schedulingApi.getTeachingLoad(termId, orgUnitId),
    enabled: !!termId && !!orgUnitId,
  });

  return (
    <div>
      <p className="mb-3 text-xs text-[var(--fg-muted)]">
        Scheduled hours are a proxy for time on campus, not measured attendance.
      </p>

      {loadQuery.isLoading ? (
        <p className="text-sm text-[var(--fg-muted)]">Loading…</p>
      ) : (loadQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--fg-muted)]">No bookings yet for this department this term.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[var(--accent-secondary)]">
              <tr>
                {['Lecturer', 'Hours', 'Courses', 'Venues', 'Bookings'].map((h) => (
                  <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(loadQuery.data ?? []).map((entry) => (
                <tr key={entry.hostId ?? 'unassigned'} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
                  <td className="border-b border-[var(--border-default)] px-3 py-2 text-[var(--fg-primary)]">{entry.displayName}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-primary)]">
                    {formatHours(entry.totalMinutes)}
                  </td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{entry.courseCount}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{entry.venueCount}</td>
                  <td className="border-b border-[var(--border-default)] px-3 py-2 tabular-nums text-[var(--fg-muted)]">{entry.bookingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
