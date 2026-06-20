/**
 * Module: ScheduleGrid
 * Layer:  web-component (TanStack Table)
 * Context: See COPILOT_CONTEXT.md, ARCHITECTURE.md §6 (web app structure), IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: The master schedule grid. Rows are time slots (ordered by the
 *          backend: day, then period); columns are org units. Cells render
 *          BookingCell, with a ClashBadge when the cell's booking appears in the
 *          clash report. Filtering is handled by the parent (already fetched
 *          data, no round-trip). When canEdit is set, empty cells get an add
 *          affordance and bookings get a delete affordance — both delegate to
 *          the parent, which owns the mutations and optimistic updates.
 */
'use client';

import { useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { BookingCell } from './BookingCell';
import type { Booking, Clash, OrgUnit, TimeSlot } from '@/types/scheduling';

interface ScheduleGridProps {
  timeSlots: TimeSlot[];
  units: OrgUnit[];
  bookings: Booking[];
  clashes?: Clash[];
  canEdit?: boolean;
  onAddBooking?: (timeSlotId: string, orgUnitId: string) => void;
  onDeleteBooking?: (bookingId: string) => void;
}

interface GridRow {
  slot: TimeSlot;
  cells: Record<string, Booking[]>; // unitId -> bookings in this slot
}

const columnHelper = createColumnHelper<GridRow>();

export function ScheduleGrid({
  timeSlots,
  units,
  bookings,
  clashes = [],
  canEdit = false,
  onAddBooking,
  onDeleteBooking,
}: ScheduleGridProps) {
  const clashesByBookingId = useMemo(() => {
    const map = new Map<string, Clash[]>();
    for (const clash of clashes) {
      for (const bookingId of clash.bookingIds) {
        const bucket = map.get(bookingId) ?? [];
        bucket.push(clash);
        map.set(bookingId, bucket);
      }
    }
    return map;
  }, [clashes]);

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
            <div className="whitespace-nowrap text-xs tabular-nums">
              <div className="font-medium text-[var(--fg-primary)]">{slot.dayOfWeek}</div>
              <div className="text-[var(--fg-muted)]">{slot.label ?? `${slot.startTime}–${slot.endTime}`}</div>
            </div>
          );
        },
      }),
      ...units.map((unit) =>
        columnHelper.accessor((row) => row.cells[unit.id] ?? [], {
          id: unit.id,
          header: unit.name,
          cell: (info) => (
            <BookingCell
              bookings={info.getValue()}
              clashesByBookingId={clashesByBookingId}
              canEdit={canEdit}
              onAdd={() => onAddBooking?.(info.row.original.slot.id, unit.id)}
              onDelete={onDeleteBooking}
            />
          ),
        }),
      ),
    ],
    [units, clashesByBookingId, canEdit, onAddBooking, onDeleteBooking],
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  if (units.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No units to display.</p>;
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
