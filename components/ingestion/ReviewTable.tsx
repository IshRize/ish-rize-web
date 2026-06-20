/**
 * Module: ReviewTable
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 5)
 *
 * Purpose: Show every parsed draft row with its resolved/unresolved fields and
 *          warnings, and let the coordinator pick a correct activity, host,
 *          venue, or time slot inline for anything the engine couldn't match —
 *          before anything is committed. The assistant proposes; the human
 *          disposes. Resolved fields use the free-slot ("OK") token; anything
 *          still needing a manual fix uses the pending token, in line with the
 *          product's 3-state clash/free/pending system.
 */
'use client';

import { Select } from '@/components/ui/Select';
import type { ActivitySummary, DraftBooking, HostSummary, TimeSlot, VenueSummary } from '@/types/scheduling';

interface ReviewTableProps {
  drafts: DraftBooking[];
  activities: ActivitySummary[];
  hosts: HostSummary[];
  venues: VenueSummary[];
  timeSlots: TimeSlot[];
  onChange: (rowIndex: number, patch: Partial<DraftBooking>) => void;
}

function timeSlotLabel(slot: TimeSlot): string {
  return `${slot.dayOfWeek} · ${slot.label ?? `${slot.startTime}–${slot.endTime}`}`;
}

function ResolvedOrFix<T extends { id: string }>({
  resolvedId,
  rawText,
  options,
  getLabel,
  onPick,
}: {
  resolvedId: string | undefined;
  rawText: string | undefined;
  options: T[];
  getLabel: (item: T) => string;
  onPick: (id: string | undefined) => void;
}) {
  if (resolvedId) {
    const item = options.find((o) => o.id === resolvedId);
    return <span className="text-[var(--fg-free-slot)]">{item ? getLabel(item) : resolvedId}</span>;
  }
  if (!rawText) {
    return <span className="text-[var(--fg-muted)]">—</span>;
  }
  return (
    <Select
      label=""
      value=""
      onChange={(v) => onPick(v || undefined)}
      options={[{ value: '', label: `Fix "${rawText}"…` }, ...options.map((o) => ({ value: o.id, label: getLabel(o) }))]}
    />
  );
}

export function ReviewTable({ drafts, activities, hosts, venues, timeSlots, onChange }: ReviewTableProps) {
  if (drafts.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No rows parsed from this file.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--accent-secondary)]">
          <tr>
            {['Row', 'Activity', 'Time slot', 'Venue', 'Host', 'Warnings'].map((h) => (
              <th key={h} className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => {
            const needsReview = d.warnings.length > 0;
            return (
              <tr
                key={d.rowIndex}
                className={needsReview ? 'bg-[var(--bg-pending)]/40' : 'even:bg-[var(--bg-alternate)]/60'}
              >
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs tabular-nums text-[var(--fg-muted)]">
                  {d.rowIndex}
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                  <ResolvedOrFix
                    resolvedId={d.courseId}
                    rawText={d.raw.code}
                    options={activities}
                    getLabel={(a) => `${a.code} — ${a.name}`}
                    onPick={(courseId) => onChange(d.rowIndex, { courseId })}
                  />
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                  <ResolvedOrFix
                    resolvedId={d.timeSlotId}
                    rawText={d.raw.day ? `${d.raw.day} ${d.raw.slot}` : undefined}
                    options={timeSlots}
                    getLabel={timeSlotLabel}
                    onPick={(timeSlotId) => onChange(d.rowIndex, { timeSlotId })}
                  />
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                  <ResolvedOrFix
                    resolvedId={d.venueId}
                    rawText={d.raw.venue}
                    options={venues}
                    getLabel={(v) => v.name}
                    onPick={(venueId) => onChange(d.rowIndex, { venueId })}
                  />
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                  <ResolvedOrFix
                    resolvedId={d.hostId}
                    rawText={d.raw.host}
                    options={hosts}
                    getLabel={(h) => h.displayName}
                    onPick={(hostId) => onChange(d.rowIndex, { hostId })}
                  />
                </td>
                <td className="border-b border-[var(--border-default)] px-3 py-2 align-top text-xs text-[var(--fg-pending)]">
                  {!needsReview ? (
                    <span className="text-[var(--fg-free-slot)]">OK</span>
                  ) : (
                    <ul className="list-inside list-disc">
                      {d.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
