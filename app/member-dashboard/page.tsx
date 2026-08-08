/**
 * Module: Member Dashboard page
 * Layer:  web-page (client)
 * Context: Stage 13 WS0 — members see their personal schedule from group memberships
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  Clock,
  Layers,
  BookOpen,
  Users2,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { dayLabel } from '@/lib/dayNames';
import type { MemberScheduleBooking } from '@/types/scheduling';

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function sortBookings(bookings: MemberScheduleBooking[]): MemberScheduleBooking[] {
  return [...bookings].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.timeSlot.dayOfWeek) - DAY_ORDER.indexOf(b.timeSlot.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
  });
}

function groupByDay(bookings: MemberScheduleBooking[]): Map<string, MemberScheduleBooking[]> {
  const map = new Map<string, MemberScheduleBooking[]>();
  for (const b of bookings) {
    const day = b.timeSlot.dayOfWeek;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(b);
  }
  return map;
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, termId, setOrganizationId, setTermId } = useScheduleSelectionStore();

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: schedulingApi.listOrganizations,
    enabled: isAuthenticated,
  });
  useEffect(() => {
    if (!organizationId && orgsQuery.data?.[0]) setOrganizationId(orgsQuery.data[0].id);
  }, [organizationId, orgsQuery.data, setOrganizationId]);

  const termsQuery = useQuery({
    queryKey: ['terms', organizationId],
    queryFn: () => schedulingApi.listTerms(organizationId),
    enabled: !!organizationId,
  });
  useEffect(() => {
    if (termsQuery.data?.length && !termsQuery.data.some((t) => t.id === termId)) {
      setTermId(termsQuery.data[0].id);
    }
  }, [termsQuery.data, termId, setTermId]);

  const scheduleQuery = useQuery({
    queryKey: ['my-member-schedule', termId],
    queryFn: () => schedulingApi.getMyMemberSchedule(termId),
    enabled: !!termId,
  });

  const isLoading = scheduleQuery.isLoading;
  const groups = scheduleQuery.data?.groups ?? [];
  const bookings = scheduleQuery.data?.bookings ?? [];
  const sorted = sortBookings(bookings);
  const byDay = groupByDay(sorted);

  const uniqueCourses = [...new Set(bookings.map((b) => b.course.id))];
  const totalMinutes = bookings.reduce((sum, b) => {
    const [sh, sm] = b.timeSlot.startTime.split(':').map(Number);
    const [eh, em] = b.timeSlot.endTime.split(':').map(Number);
    return sum + (eh * 60 + em) - (sh * 60 + sm);
  }, 0);

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading&hellip;</p>
      </main>
    );
  }

  if (!isLoading && !groups.length) {
    return (
      <AppShell>
        <PageHeader title="My Schedule" />
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Users2 size={48} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No group memberships</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            You haven&apos;t been added to any groups this term. Contact your coordinator to join a group.
          </p>
          <Button asChild variant="outline">
            <Link href="/free-finder">Find Free Rooms</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="My Schedule" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Bookings" value={bookings.length} icon={CalendarDays} colorClass="text-[var(--accent-primary)]" loading={isLoading} />
        <StatCard label="Weekly Hours" value={`${(totalMinutes / 60).toFixed(1)}h`} icon={Clock} colorClass="text-[var(--fg-pending)]" loading={isLoading} />
        <StatCard label="Activities" value={uniqueCourses.length} icon={BookOpen} colorClass="text-[var(--fg-free-slot)]" loading={isLoading} />
        <StatCard label="Groups" value={groups.length} icon={Layers} colorClass="text-[var(--accent-secondary)]" loading={isLoading} />
      </div>

      {/* Weekly schedule */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          DAY_ORDER.filter((day) => byDay.has(day)).map((day) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{dayLabel(day)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byDay.get(day)!.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-md border border-[var(--border-default)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground">{b.course.code}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{b.course.name}</span>
                        {b.host && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            &middot; {b.host.displayName}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs tabular-nums text-[var(--accent-primary)]">
                          {b.timeSlot.startTime}–{b.timeSlot.endTime}
                        </span>
                        {b.venue && (
                          <span className="ml-2 text-xs text-muted-foreground">{b.venue.name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Groups list */}
      {groups.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">My Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.groupId} className="flex items-center justify-between rounded-md border border-[var(--border-default)] px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{g.department}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link href="/free-finder">Find Free Rooms</Link>
        </Button>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon size={18} className={colorClass ?? 'text-muted-foreground'} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
