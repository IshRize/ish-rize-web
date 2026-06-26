/**
 * Module: FilterBar
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md, IMPLEMENTATION_PLAN.md (Phase 2)
 *
 * Purpose: Client-side filters over already-fetched schedule data (unit / level /
 *          venue / kind). No round-trip — instant. Labels come from config
 *          vocabulary, never hardcoded org nouns.
 */
'use client';

import { Select } from '@/components/ui/Select';
import { vocab } from '@/lib/vocab';
import type { Booking, OrgConfig, OrgUnit } from '@/types/scheduling';

export interface ScheduleFilters {
  unitId: string;
  level: string;
  kind: string;
  venueId: string;
}

export const ALL = 'ALL';

interface FilterBarProps {
  config: OrgConfig | undefined;
  units: OrgUnit[];
  bookings: Booking[];
  filters: ScheduleFilters;
  onChange(filters: ScheduleFilters): void;
}

export function FilterBar({ config, units, bookings, filters, onChange }: FilterBarProps) {
  const levels = Array.from(new Set(bookings.map((b) => b.level).filter((l): l is number => l != null))).sort(
    (a, b) => a - b,
  );
  const kinds = config?.activityKinds ?? [];
  const venues = Array.from(
    new Map(bookings.filter((b) => b.venue).map((b) => [b.venue!.id, b.venue!.name])).entries(),
  );

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <Select
        label={vocab(config, 'unit')}
        value={filters.unitId}
        onChange={(unitId) => onChange({ ...filters, unitId })}
        options={[{ value: ALL, label: `All ${vocab(config, 'unit')}s` }, ...units.map((u) => ({ value: u.id, label: u.name }))]}
      />
      <Select
        label="Level"
        value={filters.level}
        onChange={(level) => onChange({ ...filters, level })}
        options={[{ value: ALL, label: 'All levels' }, ...levels.map((l) => ({ value: String(l), label: String(l) }))]}
      />
      <Select
        label={vocab(config, 'activity') + ' kind'}
        value={filters.kind}
        onChange={(kind) => onChange({ ...filters, kind })}
        options={[{ value: ALL, label: 'All kinds' }, ...kinds.map((k) => ({ value: k.key, label: k.label }))]}
      />
      <Select
        label="Venue"
        value={filters.venueId}
        onChange={(venueId) => onChange({ ...filters, venueId })}
        options={[{ value: ALL, label: 'All venues' }, ...venues.map(([id, name]) => ({ value: id, label: name }))]}
      />
    </div>
  );
}
