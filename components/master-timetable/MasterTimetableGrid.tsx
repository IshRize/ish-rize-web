/**
 * Module: MasterTimetableGrid
 * Layer:  web-component (TanStack Table)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 4
 *
 * Purpose: Read-only grid of the Master Timetable -- rows are distinct
 *          time-of-day periods, columns are the org's configured weekdays
 *          (same axis model as ScheduleGrid). Unlike ScheduleGrid, a cell here
 *          routinely holds MANY parallel subject offerings (the real export
 *          has dozens running at once per period), so each cell renders a
 *          small scrollable list rather than assuming one occupant.
 */
'use client';

import { useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import type { MasterSlotRow } from '@/types/scheduling';

interface MasterTimetableGridProps {
  slots: MasterSlotRow[];
  weekDays: string[];
}

interface PeriodRow {
  key: string;
  label: string | null;
  startTime: string;
  endTime: string;
  slotsByDay: Record<string, MasterSlotRow[]>;
}

const columnHelper = createColumnHelper<PeriodRow>();

export function MasterTimetableGrid({ slots, weekDays }: MasterTimetableGridProps) {
  const periodRows = useMemo<PeriodRow[]>(() => {
    const map = new Map<string, PeriodRow>();
    for (const slot of slots) {
      const key = `${slot.timeSlot.startTime}__${slot.timeSlot.endTime}`;
      let row = map.get(key);
      if (!row) {
        row = { key, label: slot.timeSlot.label, startTime: slot.timeSlot.startTime, endTime: slot.timeSlot.endTime, slotsByDay: {} };
        map.set(key, row);
      }
      const bucket = row.slotsByDay[slot.dayOfWeek] ?? [];
      bucket.push(slot);
      row.slotsByDay[slot.dayOfWeek] = bucket;
    }
    return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots]);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row, {
        id: 'period',
        header: 'Period',
        cell: (info) => {
          const row = info.getValue();
          return (
            <div className="whitespace-nowrap text-xs tabular-nums font-medium text-[var(--fg-primary)]">
              {row.label ?? `${row.startTime}–${row.endTime}`}
            </div>
          );
        },
      }),
      ...weekDays.map((day) =>
        columnHelper.accessor((row) => row.slotsByDay[day] ?? [], {
          id: day,
          header: day,
          cell: (info) => {
            const entries = info.getValue();
            if (entries.length === 0) return <span className="text-[var(--fg-muted)]">—</span>;
            return (
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                {entries.map((e) => (
                  <li key={e.id} className="text-xs">
                    <span className="font-medium text-[var(--fg-primary)]">{e.subjectCode}</span>
                    {e.level != null && <span className="text-[var(--fg-muted)]"> · L{e.level}</span>}
                    {e.venue && <span className="text-[var(--fg-muted)]"> · {e.venue.name}</span>}
                  </li>
                ))}
              </ul>
            );
          },
        }),
      ),
    ],
    [weekDays],
  );

  const table = useReactTable({ data: periodRows, columns, getCoreRowModel: getCoreRowModel() });

  if (weekDays.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No scheduling days configured.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--accent-secondary)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-b border-[var(--border-default)] px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-b border-[var(--border-default)] px-3 py-2 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
