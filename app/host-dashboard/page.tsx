'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  Clock,
  Layers,
  BookOpen,
  GaugeCircle,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

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

export default function HostDashboardPage() {
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

  const loadQuery = useQuery({
    queryKey: ['my-teaching-load', termId],
    queryFn: () => schedulingApi.getMyTeachingLoad(termId),
    enabled: !!termId,
  });

  const myHostQuery = useQuery({
    queryKey: ['my-host'],
    queryFn: () => schedulingApi.getMyHost(),
    enabled: !!isAuthenticated,
  });

  const load = loadQuery.data;
  const isLoading = loadQuery.isLoading || myHostQuery.isLoading;
  const totalHours = load ? (load.totalMinutes / 60).toFixed(1) : '0';

  if (authLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--fg-muted)]">Loading&hellip;</p>
      </main>
    );
  }

  if (!myHostQuery.isLoading && !myHostQuery.data) {
    return (
      <AppShell>
        <PageHeader title="Host Dashboard" />
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <GaugeCircle size={48} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No teaching record</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            You don&apos;t have a host profile in this organization. Contact your coordinator to be added as a lecturer or instructor.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Host Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bookings"
          value={load?.bookingCount ?? 0}
          icon={CalendarCheck}
          colorClass="text-[var(--accent-primary)]"
          loading={isLoading}
        />
        <StatCard
          label="Scheduled Hours"
          value={`${totalHours}h`}
          icon={Clock}
          colorClass="text-[var(--fg-pending)]"
          loading={isLoading}
        />
        <StatCard
          label="Activities"
          value={load?.courses.length ?? 0}
          icon={BookOpen}
          colorClass="text-[var(--fg-free-slot)]"
          loading={isLoading}
        />
        <StatCard
          label="Groups"
          value={load?.groups.length ?? 0}
          icon={Layers}
          colorClass="text-[var(--accent-secondary)]"
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Activities This Term</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : !load?.courses.length ? (
              <p className="text-sm text-muted-foreground">No activities assigned this term.</p>
            ) : (
              <ul className="space-y-2">
                {load.courses.map((c) => (
                  <li key={c.courseId} className="flex items-center justify-between rounded-md border border-[var(--border-default)] px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">{c.code}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{c.name}</span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {(c.minutes / 60).toFixed(1)}h &middot; {c.bookingCount} booking{c.bookingCount !== 1 ? 's' : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Assigned Groups</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !load?.groups.length ? (
              <p className="text-sm text-muted-foreground">No groups assigned this term.</p>
            ) : (
              <ul className="space-y-2">
                {load.groups.map((g) => (
                  <li key={g.groupId} className="flex items-center justify-between rounded-md border border-[var(--border-default)] px-3 py-2">
                    <span className="text-sm font-medium text-foreground">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{g.department}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline">
          <Link href="/my-timetable">View My Timetable</Link>
        </Button>
      </div>
    </AppShell>
  );
}
