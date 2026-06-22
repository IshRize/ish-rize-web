/**
 * Module: ScheduleGrid
 * Layer:  web-component (TanStack Table)
 * Context: See COPILOT_CONTEXT.md, ARCHITECTURE.md §6 (web app structure), IMPLEMENTATION_PLAN.md (Phase 4)
 *
 * Purpose: The master schedule grid. Rows are distinct time-of-day periods
 *          (e.g. "7:30–9:30"), ordered by start time; columns are the org's
 *          configured weekdays (dynamic — read from OrgConfig.weekDays, never
 *          hardcoded Mon–Fri), in that order. This matches how a real master
 *          timetable actually reads: one period per row, one day per column.
 *          A department/unit is a FILTER (see FilterBar), not a grid axis —
 *          the source format uses one sheet per cohort, which this mirrors by
 *          scoping the bookings the parent passes in, not by adding a third
 *          axis to the table.
 *
 *          Cells render BookingCell, with a ClashBadge when the cell's booking
 *          appears in the clash report. When canEdit is set AND a single unit
 *          is targeted (targetOrgUnitId), empty cells get an add affordance —
 *          adding a booking needs to know which unit's activities/hosts to
 *          offer, which a day column alone can't tell you.
 */
'use client';

import { useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { BookingCell } from './BookingCell';
import type { Booking, Clash, TimeSlot } from '@/types/scheduling';

interface ScheduleGridProps {
  timeSlots: TimeSlot[];
  weekDays: string[];
  bookings: Booking[];
  clashes?: Clash[];
  canEdit?: boolean;
  targetOrgUnitId?: string;
  onAddBooking?: (timeSlotId: string) => void;
  onDeleteBooking?: (bookingId: string) => void;
}

interface PeriodRow {
  key: string;
  label: string | null;
  startTime: string;
  endTime: string;
  slotsByDay: Record<string, TimeSlot>;
}

const columnHelper = createColumnHelper<PeriodRow>();

export function ScheduleGrid({
  timeSlots,
  weekDays,
  bookings,
  clashes = [],
  canEdit = false,
  targetOrgUnitId,
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

  const bookingsBySlot = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const bucket = map.get(booking.timeSlotId) ?? [];
      bucket.push(booking);
      map.set(booking.timeSlotId, bucket);
    }
    return map;
  }, [bookings]);

  // Collapse the day-specific TimeSlot rows into one row per distinct period,
  // so "7:30–9:30" appears once with every configured day as a column —
  // matching the real master timetable's layout — instead of once per day.
  const periodRows = useMemo<PeriodRow[]>(() => {
    const map = new Map<string, PeriodRow>();
    for (const slot of timeSlots) {
      const key = `${slot.startTime}__${slot.endTime}`;
      let row = map.get(key);
      if (!row) {
        row = { key, label: slot.label, startTime: slot.startTime, endTime: slot.endTime, slotsByDay: {} };
        map.set(key, row);
      }
      row.slotsByDay[slot.dayOfWeek] = slot;
    }
    return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timeSlots]);

  const canAdd = canEdit && !!targetOrgUnitId;

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row, {
        id: 'period',
        header: 'Period',
        cell: (info) => {
          const row = info.getValue();
          return (
            <div className="whitespace-nowrap text-xs tabular-nums">
              <div className="font-medium text-[var(--fg-primary)]">{row.label ?? `${row.startTime}–${row.endTime}`}</div>
            </div>
          );
        },
      }),
      ...weekDays.map((day) =>
        columnHelper.accessor((row) => row.slotsByDay[day], {
          id: day,
          header: day,
          cell: (info) => {
            const slot = info.getValue();
            if (!slot) return <span className="text-[var(--fg-muted)]">—</span>;
            return (
              <BookingCell
                bookings={bookingsBySlot.get(slot.id) ?? []}
                clashesByBookingId={clashesByBookingId}
                canEdit={canAdd}
                onAdd={() => onAddBooking?.(slot.id)}
                onDelete={onDeleteBooking}
              />
            );
          },
        }),
      ),
    ],
    [weekDays, bookingsBySlot, clashesByBookingId, canAdd, onAddBooking, onDeleteBooking],
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
