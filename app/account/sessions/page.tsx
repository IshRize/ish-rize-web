'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  Loader2,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Session } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days}d ago`;
}

function deviceIcon(deviceInfo: string | null) {
  if (!deviceInfo) return Globe;
  const lower = deviceInfo.toLowerCase();
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return Smartphone;
  return Monitor;
}

export default function SessionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: authApi.listSessions,
    enabled: isAuthenticated,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sessions = sessionsQuery.data?.sessions ?? [];

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Sessions" description="Manage your active sessions across devices" />

      <div className="max-w-2xl space-y-4">
        {sessionsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe size={48} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No active sessions</p>
              <p className="mt-1 text-sm text-muted-foreground">Your session data will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session: Session, index: number) => {
            const DeviceIcon = deviceIcon(session.deviceInfo);
            const isCurrent = index === 0;
            return (
              <Card key={session.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                    <DeviceIcon size={20} className="text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {session.deviceInfo || 'Unknown device'}
                      </p>
                      {isCurrent && <Badge variant="default">Current</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      {session.ipAddress && <span>{session.ipAddress}</span>}
                      <span>Active {timeAgo(session.lastUsedAt)}</span>
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive shrink-0"
                      onClick={() => revokeMutation.mutate(session.id)}
                      disabled={revokeMutation.isPending}
                    >
                      {revokeMutation.isPending ? (
                        <Loader2 size={14} className="mr-1 animate-spin" />
                      ) : (
                        <Trash2 size={14} className="mr-1" />
                      )}
                      Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
