'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Upload,
  Plus,
} from 'lucide-react';
import { schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function OverviewPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
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
  }, [termId, termsQuery.data, setTermId]);

  const scheduleQuery = useQuery({
    queryKey: ['schedule', termId],
    queryFn: () => schedulingApi.getSchedule(termId),
    enabled: !!termId,
  });

  const clashQuery = useQuery({
    queryKey: ['clashes', termId],
    queryFn: () => schedulingApi.getClashes(termId),
    enabled: !!termId,
  });

  const bookingCount = scheduleQuery.data?.bookings?.length ?? 0;
  const clashCount = clashQuery.data?.length ?? 0;
  const loading = scheduleQuery.isLoading || clashQuery.isLoading;

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Overview" description="Your organization at a glance">
        <Link href="/schedule">
          <Button>
            <Plus size={16} className="mr-2" />
            New Booking
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Bookings"
            value={bookingCount}
            icon={CalendarDays}
            colorClass="text-primary"
            loading={loading}
          />
          <StatCard
            label="Clashes"
            value={clashCount}
            icon={AlertTriangle}
            colorClass="text-[var(--fg-clash)]"
            loading={loading}
          />
          <StatCard
            label="Pending"
            value={0}
            icon={Clock}
            colorClass="text-[var(--fg-pending)]"
            loading={loading}
          />
          <StatCard
            label="Terms"
            value={termsQuery.data?.length ?? 0}
            icon={TrendingUp}
            colorClass="text-[var(--fg-free-slot)]"
            loading={termsQuery.isLoading}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/people">
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Users size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Manage People</p>
                    <p className="text-sm text-muted-foreground">View and invite team members</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/ingestion">
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Upload size={20} className="text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Upload Schedule</p>
                    <p className="text-sm text-muted-foreground">Import a timetable file</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/clashes">
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardContent className="flex items-center gap-3 pt-6">
                  <AlertTriangle size={20} className="text-[var(--fg-clash)]" />
                  <div>
                    <p className="font-medium text-foreground">View Clashes</p>
                    <p className="text-sm text-muted-foreground">Resolve scheduling conflicts</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Current context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current context</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Signed in as <span className="font-medium text-foreground">{user?.firstName} {user?.lastName}</span>
              {orgsQuery.data?.[0] && (
                <> · <span className="font-medium text-foreground">{orgsQuery.data[0].name}</span></>
              )}
              {termsQuery.data?.find(t => t.id === termId) && (
                <> · <span className="font-medium text-foreground">{termsQuery.data.find(t => t.id === termId)?.name}</span></>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
