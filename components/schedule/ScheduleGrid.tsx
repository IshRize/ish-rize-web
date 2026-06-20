/**
 * Module: ScheduleGrid
 * Layer:  web-component (TanStack Table)
 * Context: See COPILOT_CONTEXT.md, ARCHITECTURE.md §6 (web app structure)
 *
 * Purpose: The master schedule grid — read-only in Phase 2. Rows are time slots
 *          (ordered by the backend: day, then period); columns are org units.
 *          Cells render BookingCell. Filtering is handled by the parent (already
 *          fetched data, no round-trip) — this component just renders the result.
 */
'use client';

import { useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { BookingCell } from './BookingCell';
import type { Booking, OrgUnit, TimeSlot } from '@/types/scheduling';

interface ScheduleGridProps {
  timeSlots: TimeSlot[];
  units: OrgUnit[];
  bookings: Booking[];
}

interface GridRow {
  slot: TimeSlot;
  cells: Record<string, Booking[]>; // unitId -> bookings in this slot
}

const columnHelper = createColumnHelper<GridRow>();

export function ScheduleGrid({ timeSlots, units, bookings }: ScheduleGridProps) {
  const rows = useMemo<GridRow[]>(() => {
    return timeSlots.map((slot) => {
      const cells: Record<string, Booking[]> = {};
      for (const unit of units) {
        cells[unit.id] = bookings.filter((b) => b.timeSlotId === slot.id && b.course.orgUnitId === unit.id);
      }
      return { slot, cells };
    });
  }, [timeSlots, units, bookings]);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.slot, {
        id: 'slot',
        header: 'Day · Period',
        cell: (info) => {
          const slot = info.getValue();
          return (
            <div className="whitespace-nowrap text-xs">
              <div className="font-medium text-[var(--color-text-primary)]">{slot.dayOfWeek}</div>
              <div className="text-[var(--color-text-secondary)]">
                {slot.label ?? `${slot.startTime}–${slot.endTime}`}
              </div>
            </div>
          );
        },
      }),
      ...units.map((unit) =>
        columnHelper.accessor((row) => row.cells[unit.id] ?? [], {
          id: unit.id,
          header: unit.name,
          cell: (info) => <BookingCell bookings={info.getValue()} />,
        }),
      ),
    ],
    [units],
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  if (units.length === 0) {
    return <p className="text-sm text-[var(--color-text-secondary)]">No units to display.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[var(--color-surface)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-b border-[var(--color-border)] px-3 py-2 text-left text-xs font-semibold text-[var(--color-text-secondary)]"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="even:bg-[var(--color-bg-secondary)]/40">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-b border-[var(--color-border-light)] px-3 py-2 align-top">
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
