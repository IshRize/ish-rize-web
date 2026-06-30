/**
 * Module: DepartmentScheduleGrid
 * Layer:  web-component (TanStack Table + dnd-kit)
 * Context: See COPILOT_CONTEXT.md; dept-coordinator tooling Phase 3
 *
 * Purpose: A day/period grid for ONE department's bookings, like
 *          ScheduleGrid, but editable by drag-and-drop: dragging a booking
 *          card to a different cell moves it to that day+period (calls
 *          onMoveBooking with the new TimeSlot id). Kept as a separate
 *          component rather than extending ScheduleGrid itself, since that
 *          one is shared with the org-wide Schedule page and shouldn't pick
 *          up a drag-and-drop dependency it doesn't need.
 *
 *          Deliberately a separate VIEW from the "Manage offerings" table on
 *          this same page: that table groups bookings by their origin
 *          MasterSlot (for decomposing/host-assignment); this grid places
 *          each booking by its OWN current day/time, which is exactly what
 *          drag-and-drop needs to change.
 */
'use client';

import { useMemo, useState } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { DraggableBookingCard } from './DraggableBookingCard';
import { DroppableTimeCell } from './DroppableTimeCell';
import { dayLabel } from '@/lib/dayNames';
import type { Booking, Clash, DepartmentTimetableSlot, TimeSlot } from '@/types/scheduling';

interface DepartmentScheduleGridProps {
  timeSlots: TimeSlot[];
  weekDays: string[];
  bookings: Booking[];
  clashes?: Clash[];
  canEdit?: boolean;
  timetableSlots?: DepartmentTimetableSlot[];
  onMoveBooking?: (bookingId: string, fromTimeSlotId: string, toTimeSlotId: string) => void;
  onDeleteBooking?: (bookingId: string) => void;
  onAutoReschedule?: (bookingId: string) => void;
  onAddOffering?: (slot: DepartmentTimetableSlot) => void;
}

interface PeriodRow {
  key: string;
  label: string | null;
  startTime: string;
  endTime: string;
  slotsByDay: Record<string, TimeSlot>;
}

const columnHelper = createColumnHelper<PeriodRow>();

export function DepartmentScheduleGrid({
  timeSlots,
  weekDays,
  bookings,
  clashes = [],
  canEdit = false,
  timetableSlots = [],
  onMoveBooking,
  onDeleteBooking,
  onAutoReschedule,
  onAddOffering,
}: DepartmentScheduleGridProps) {
  // A small movement threshold so clicking the "x" remove button on a card
  // doesn't get swallowed as a drag start.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // When multiple MasterSlots share the same timeSlotId (rare but possible),
  // we need a mini-picker before opening the decompose modal.
  const [slotPicker, setSlotPicker] = useState<DepartmentTimetableSlot[] | null>(null);

  // Index MasterSlots by the TimeSlot they occupy so cell-click lookups are O(1).
  const timetableByTimeSlotId = useMemo(() => {
    const map = new Map<string, DepartmentTimetableSlot[]>();
    for (const s of timetableSlots) {
      const bucket = map.get(s.timeSlotId) ?? [];
      bucket.push(s);
      map.set(s.timeSlotId, bucket);
    }
    return map;
  }, [timetableSlots]);

  function handleCellAdd(timeSlotId: string) {
    const matches = timetableByTimeSlotId.get(timeSlotId) ?? [];
    if (matches.length === 0) return;
    if (matches.length === 1) {
      onAddOffering?.(matches[0]);
    } else {
      setSlotPicker(matches);
    }
  }

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id === active.id) return;
    const booking = bookings.find((b) => b.id === active.id);
    if (!booking) return;
    const toTimeSlotId = String(over.id);
    if (toTimeSlotId === booking.timeSlotId) return;
    onMoveBooking?.(booking.id, booking.timeSlotId, toTimeSlotId);
  }

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
        columnHelper.accessor((row) => row.slotsByDay[day], {
          id: day,
          header: dayLabel(day),
          cell: (info) => {
            const slot = info.getValue();
            if (!slot) return <span className="text-[var(--fg-muted)]">—</span>;
            const slotBookings = bookingsBySlot.get(slot.id) ?? [];
            const hasMasterSlot = canEdit && onAddOffering && timetableByTimeSlotId.has(slot.id);
            return (
              <DroppableTimeCell timeSlotId={slot.id} canDrop={canEdit}>
                {slotBookings.length === 0 ? (
                  hasMasterSlot ? (
                    <button
                      type="button"
                      onClick={() => handleCellAdd(slot.id)}
                      className="flex h-full min-h-[2.5rem] w-full items-center justify-center rounded-md border border-dashed border-[var(--fg-free-slot)]/40 bg-[var(--bg-free-slot)]/20 text-xs text-[var(--fg-free-slot)] hover:border-[var(--fg-free-slot)] hover:bg-[var(--bg-free-slot)]/40 transition-colors"
                    >
                      + Add
                    </button>
                  ) : (
                    <span className="flex h-full w-full items-center justify-center rounded-md bg-[var(--bg-free-slot)]/30 text-xs text-[var(--fg-free-slot)]">
                      Free
                    </span>
                  )
                ) : (
                  <div className="space-y-1">
                    {slotBookings.map((b) => (
                      <DraggableBookingCard
                        key={b.id}
                        booking={b}
                        clashes={clashesByBookingId.get(b.id) ?? []}
                        canEdit={canEdit}
                        onDelete={onDeleteBooking}
                        onAutoReschedule={onAutoReschedule}
                      />
                    ))}
                    {hasMasterSlot && (
                      <button
                        type="button"
                        onClick={() => handleCellAdd(slot.id)}
                        className="w-full rounded-md border border-dashed border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)] transition-colors"
                      >
                        + Add another
                      </button>
                    )}
                  </div>
                )}
              </DroppableTimeCell>
            );
          },
        }),
      ),
    ],
    [weekDays, bookingsBySlot, clashesByBookingId, canEdit, onDeleteBooking, onAutoReschedule, timetableByTimeSlotId, onAddOffering],
  );

  const table = useReactTable({ data: periodRows, columns, getCoreRowModel: getCoreRowModel() });

  if (weekDays.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)]">No scheduling days configured.</p>;
  }

  return (
    <>
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
                  <td
                    key={cell.id}
                    className={`border-b border-[var(--border-default)] px-3 py-2 ${cell.column.id === 'period' ? 'align-middle' : 'align-top'}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DndContext>

    {/* Multi-slot picker: shown when two+ MasterSlots share the same timeSlot */}
    {slotPicker && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-backdrop)] p-4"
        onClick={() => setSlotPicker(null)}
      >
        <div
          className="w-full max-w-xs space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-[var(--fg-primary)]">Which subject are you adding to?</p>
          {slotPicker.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSlotPicker(null); onAddOffering?.(s); }}
              className="w-full rounded-md border border-[var(--border-default)] px-3 py-2 text-left text-sm text-[var(--fg-primary)] hover:bg-[var(--bg-alternate)]"
            >
              {s.subjectCode}{s.level != null ? ` (Level ${s.level})` : ''}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSlotPicker(null)}
            className="w-full text-xs text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </>
  );
}
