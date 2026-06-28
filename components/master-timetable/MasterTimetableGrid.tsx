/**
 * Module: MasterTimetableGrid
 * Layer:  web-component (TanStack Table)
 * Context: See COPILOT_CONTEXT.md; three-tier timetable refactor Phase 4;
 *          Phase 2 of the cross-role fixes plan (scroll-sync fix, click-to-edit)
 *
 * Purpose: Grid of the Master Timetable -- rows are distinct time-of-day
 *          periods, columns are the org's configured weekdays (same axis model
 *          as ScheduleGrid). Unlike ScheduleGrid, a cell here routinely holds
 *          MANY parallel subject offerings (the real export has dozens running
 *          at once per period), so each entry shows Subject/Level/Venue as an
 *          aligned inline row -- one cramped text line per entry doesn't line
 *          up across rows once codes/venues vary in length, but aligned columns
 *          do, the same way the real spreadsheet exports lay it out.
 *
 *          Each day is exactly ONE TanStack leaf column (not a column group
 *          with Subject/Level/Venue as separate sub-columns, as a previous
 *          version had) -- the Subject/Level/Venue alignment is pure CSS grid
 *          inside that single header/cell, using the identical
 *          gridTemplateColumns in both, rather than three independently
 *          scrolling <td>s. That's what made "Compact (scrollable) cells"
 *          scroll Subject and Venue independently before: each field had its
 *          OWN overflow-y-auto container. Now there's exactly one scroll
 *          container per day-cell, so an entry's fields can never drift apart.
 *
 *          Level is only shown as its own field when more than one level can
 *          appear (showLevelColumn) -- once the page's own Level filter has
 *          narrowed everything to one level, repeating it per row is just noise.
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
  /** Admin-only: clicking an entry opens the edit/reallocate/delete modal. Omit to keep the grid read-only. */
  onEntryClick?: (slot: MasterSlotRow) => void;
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

const FIELD_LABEL: Record<Field, string> = { subject: 'Subject', level: 'Level', venue: 'Venue' };

function fieldValue(slot: MasterSlotRow, field: Field): string {
  if (field === 'subject') return slot.subjectCode;
  if (field === 'level') return slot.level != null ? `L${slot.level}` : '—';
  return slot.venue?.name ?? '—';
}

/** Same template used by the header and every entry row in a day-cell, so the fields line up. */
function gridTemplate(fields: Field[]): string {
  return fields.map((f) => (f === 'level' ? '2.5rem' : 'minmax(0,1fr)')).join(' ');
}

function DayHeader({ day, fields }: { day: string; fields: Field[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span>{dayLabel(day)}</span>
      <div className="grid gap-2" style={{ gridTemplateColumns: gridTemplate(fields) }}>
        {fields.map((f) => (
          <span key={f} className="truncate text-[10px] font-normal uppercase tracking-wide text-[var(--fg-on-accent-primary)]/70">
            {FIELD_LABEL[f]}
          </span>
        ))}
      </div>
    </div>
  );
}

function DayCell({
  entries,
  fields,
  scrollable,
  onEntryClick,
}: {
  entries: MasterSlotRow[];
  fields: Field[];
  scrollable: boolean;
  onEntryClick?: (slot: MasterSlotRow) => void;
}) {
  if (entries.length === 0) return <span className="text-[var(--fg-muted)]">—</span>;
  return (
    <ul className={`space-y-1 ${scrollable ? 'max-h-28 overflow-y-auto' : ''}`}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
            disabled={!onEntryClick}
            className={`grid w-full gap-2 rounded-sm text-left ${onEntryClick ? 'cursor-pointer hover:bg-[var(--bg-alternate)]' : 'cursor-default'}`}
            style={{ gridTemplateColumns: gridTemplate(fields) }}
          >
            {fields.map((field) => (
              <span
                key={field}
                className={`truncate text-xs leading-5 ${field === 'subject' ? 'font-medium text-[var(--fg-primary)]' : 'text-[var(--fg-muted)]'}`}
                title={fieldValue(entry, field)}
              >
                {fieldValue(entry, field)}
              </span>
            ))}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MasterTimetableGrid({ slots, weekDays, showLevelColumn, showGridLines, scrollableCells, onEntryClick }: MasterTimetableGridProps) {
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
        columnHelper.accessor((row) => row.slotsByDay[day] ?? [], {
          id: day,
          header: () => <DayHeader day={day} fields={fields} />,
          cell: (info) => <DayCell entries={info.getValue()} fields={fields} scrollable={scrollableCells} onEntryClick={onEntryClick} />,
        }),
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDays, showLevelColumn, scrollableCells, onEntryClick],
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
