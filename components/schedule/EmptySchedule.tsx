/**
 * Module: EmptySchedule
 * Layer:  web-component (presentational)
 * Context: See schedule/page.tsx — shown when the grid has zero bookings for
 *          the selected term, guiding the coordinator through the workflow
 *          instead of a blank table.
 *
 * Exports:
 *   EmptySchedule — client component
 */
'use client';

import Link from 'next/link';
import { Icons } from '@/lib/icons';

interface Step {
  number: number;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  done: boolean;
}

interface EmptyScheduleProps {
  isAdmin: boolean;
  hasMasterSlots: boolean;
  hasBookings: boolean;
}

export function EmptySchedule({ isAdmin, hasMasterSlots, hasBookings }: EmptyScheduleProps) {
  if (hasBookings) return null;

  const steps: Step[] = [
    {
      number: 1,
      title: 'Upload the master timetable',
      description: 'Import the institution-wide schedule from a PDF, Excel, or CSV file. The system parses it, lets you review, then commits.',
      href: '/ingestion',
      linkLabel: 'Go to Ingestion',
      done: hasMasterSlots,
    },
    {
      number: 2,
      title: 'Decompose into department bookings',
      description: 'Each coordinator breaks their department\'s master slots into specific courses, lecturers, and venues.',
      href: '/department-timetable',
      linkLabel: 'Open Department Timetable',
      done: false,
    },
    {
      number: 3,
      title: 'Review and resolve clashes',
      description: 'The system detects venue, host, and group clashes automatically. Resolve them here or drag-and-drop on the grid.',
      href: '/clashes',
      linkLabel: 'View Clashes',
      done: false,
    },
  ];

  const adminSteps = isAdmin ? steps : steps.slice(1);

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <Icons.schedule size={24} color="var(--fg-muted)" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[var(--fg-primary)]">
          No bookings yet
        </h2>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          {isAdmin
            ? 'Start by uploading a master timetable, then coordinators can decompose it into department schedules.'
            : 'Your coordinator or admin needs to set up the schedule. Once bookings exist, they\'ll appear here.'}
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {adminSteps.map((step) => (
          <Link
            key={step.number}
            href={step.href}
            className="flex items-start gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 transition-colors hover:border-[var(--accent-primary)]/40"
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.done
                  ? 'bg-[var(--bg-free-slot)] text-[var(--fg-free-slot)]'
                  : 'bg-[var(--bg-alternate)] text-[var(--fg-muted)]'
              }`}
            >
              {step.done ? '✓' : step.number}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg-primary)]'}`}>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{step.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
