'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import { orgApi, schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { AuditLogEntry } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 20;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => { setPage(1); }, [actionFilter, debouncedSearch]);

  const auditQuery = useQuery({
    queryKey: ['auditLog', organizationId, page, actionFilter, debouncedSearch],
    queryFn: () =>
      orgApi.getAuditLog(organizationId, {
        page,
        limit: PAGE_SIZE,
        action: actionFilter || undefined,
        userId: debouncedSearch || undefined,
      }),
    enabled: !!organizationId,
  });

  const entries = auditQuery.data?.items ?? [];
  const pagination = auditQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader
        title="Audit Log"
        description="Track all actions and changes within your organization"
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by user ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter size={14} className="mr-2 text-muted-foreground" />
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="LOGOUT">Logout</SelectItem>
              <SelectItem value="REGISTER">Register</SelectItem>
              <SelectItem value="CREATE_ORG">Create Org</SelectItem>
              <SelectItem value="UPDATE_ORG">Update Org</SelectItem>
              <SelectItem value="INVITE_MEMBER">Invite Member</SelectItem>
              <SelectItem value="REMOVE_MEMBER">Remove Member</SelectItem>
              <SelectItem value="CHANGE_ROLE">Change Role</SelectItem>
              <SelectItem value="CREATE_VENUE">Create Venue</SelectItem>
              <SelectItem value="CREATE_COURSE">Create Course</SelectItem>
              <SelectItem value="CHANGE_PASSWORD">Change Password</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={40} className="text-muted-foreground/40" />
                      <p className="font-medium text-foreground">No audit entries</p>
                      <p className="text-sm text-muted-foreground">
                        {actionFilter || debouncedSearch
                          ? 'Try adjusting your filters.'
                          : 'Actions will be recorded here automatically.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry: AuditLogEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      {entry.user ? (
                        <span className="text-sm font-medium text-foreground">
                          {entry.user.firstName} {entry.user.lastName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-foreground">
                        {formatAction(entry.action)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {entry.targetType ? (
                        <span>{entry.targetType}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">
                      {entry.ipAddress || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
              {pagination?.total != null && ` · ${pagination.total} entries`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} className="mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
