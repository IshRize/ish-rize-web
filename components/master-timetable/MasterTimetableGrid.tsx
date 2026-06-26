/**
 * Module: MasterTimetableGrid
 * Layer:  web-component (TanStack Table)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 4
 *
 * Purpose: Read-only grid of the Master Timetable -- rows are distinct
 *          time-of-day periods, columns are the org's configured weekdays
 *          (same axis model as ScheduleGrid). Unlike ScheduleGrid, a cell here
 *          routinely holds MANY parallel subject offerings (the real export
 *          has dozens running at once per period), so each day is a column
 *          GROUP with Subject/Level/Venue as separate sub-columns -- one
 *          cramped text line per entry doesn't line up across rows once
 *          codes/venues vary in length, but three aligned columns do, the
 *          same way the real spreadsheet exports lay it out.
 *
 *          Level is only its own sub-column when more than one level can
 *          appear (showLevelColumn) -- once the page's own Level filter has
 *          narrowed everything to one level, repeating it per row is just
 *          noise.
 */
'use client';

import { useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { dayLabel } from '@/lib/dayNames';
import type { MasterSlotRow } from '@/types/scheduling';

interface MasterTimetableGridProps {
  slots: MasterSlotRow[];
  weekDays: string[];
  showLevelColumn: boolean;
  showGridLines: boolean;
  scrollableCells: boolean;
}

interface PeriodRow {
  key: string;
  label: string | null;
  startTime: string;
  endTime: string;
  slotsByDay: Record<string, MasterSlotRow[]>;
}

const columnHelper = createColumnHelper<PeriodRow>();

type Field = 'subject' | 'level' | 'venue';

function fieldValue(slot: MasterSlotRow, field: Field): string {
  if (field === 'subject') return slot.subjectCode;
  if (field === 'level') return slot.level != null ? `L${slot.level}` : '—';
  return slot.venue?.name ?? '—';
}

function EntryColumn({ entries, field, scrollable }: { entries: MasterSlotRow[]; field: Field; scrollable: boolean }) {
  if (entries.length === 0) return <span className="text-[var(--fg-muted)]">—</span>;
  return (
    <ul className={`space-y-1 ${scrollable ? 'max-h-28 overflow-y-auto' : ''}`}>
      {entries.map((e) => (
        <li
          key={e.id}
          className={`truncate text-xs leading-5 ${field === 'subject' ? 'font-medium text-[var(--fg-primary)]' : 'text-[var(--fg-muted)]'}`}
          title={fieldValue(e, field)}
        >
          {fieldValue(e, field)}
        </li>
      ))}
    </ul>
  );
}

export function MasterTimetableGrid({ slots, weekDays, showLevelColumn, showGridLines, scrollableCells }: MasterTimetableGridProps) {
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

  const fields: Field[] = showLevelColumn ? ['subject', 'level', 'venue'] : ['subject', 'venue'];
  const fieldHeader: Record<Field, string> = { subject: 'Subject', level: 'Level', venue: 'Venue' };

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row, {
        id: 'period',
        header: 'Time',
        cell: (info) => {
          const row = info.getValue();
          return (
            <div className="whitespace-nowrap text-center text-xs tabular-nums font-medium text-[var(--fg-primary)]">
              {row.startTime}–{row.endTime}
            </div>
          );
        },
      }),
      ...weekDays.map((day) =>
        columnHelper.group({
          id: day,
          header: dayLabel(day),
          columns: fields.map((field) =>
            columnHelper.accessor((row) => row.slotsByDay[day] ?? [], {
              id: `${day}-${field}`,
              header: fieldHeader[field],
              cell: (info) => <EntryColumn entries={info.getValue()} field={field} scrollable={scrollableCells} />,
            }),
          ),
        }),
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays, showLevelColumn, scrollableCells],
  );

  const table = useReactTable({ data: periodRows, columns, getCoreRowModel: getCoreRowModel() });

  if (weekDays.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No scheduling days configured.</p>;
  }

  const cellBorder = showGridLines ? 'border border-[var(--border-default)]' : 'border-b border-[var(--border-default)]';

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--accent-secondary)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={`${cellBorder} px-3 py-2 text-left text-xs font-semibold text-[var(--fg-on-accent-primary)]`}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="even:bg-[var(--bg-alternate)]/60 hover:bg-[var(--bg-alternate)]">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`${cellBorder} px-3 py-2 ${cell.column.id === 'period' ? 'align-middle' : 'align-top'}`}
                >
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
