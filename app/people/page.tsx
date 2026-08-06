'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  MoreHorizontal,
  UserX,
  UserCheck,
  Trash2,
  Shield,
  Loader2,
  Users,
} from 'lucide-react';
import { orgApi, schedulingApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { OrgMember, OrgRole, OrgInvitation } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteModal } from '@/components/people/InviteModal';
import { toast } from 'sonner';

function roleBadgeVariant(role: OrgRole) {
  switch (role) {
    case 'OWNER': return 'default' as const;
    case 'ADMIN': return 'default' as const;
    case 'COORDINATOR': return 'secondary' as const;
    case 'MEMBER': return 'outline' as const;
  }
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'ACTIVE': return 'default' as const;
    case 'SUSPENDED': return 'destructive' as const;
    default: return 'outline' as const;
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months}mo ago`;
}

export default function PeoplePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);

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

  const membersQuery = useQuery({
    queryKey: ['members', organizationId, page, search, roleFilter, statusFilter],
    queryFn: () =>
      orgApi.listMembers(organizationId, {
        page,
        limit: 25,
        search: search || undefined,
        role: roleFilter !== 'all' ? (roleFilter as OrgRole) : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: !!organizationId,
  });

  const invitationsQuery = useQuery({
    queryKey: ['invitations', organizationId],
    queryFn: () => orgApi.listInvitations(organizationId),
    enabled: !!organizationId,
  });

  const suspendMutation = useMutation({
    mutationFn: (memberId: string) => orgApi.suspendMember(organizationId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', organizationId] });
      toast.success('Member suspended');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (memberId: string) => orgApi.unsuspendMember(organizationId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', organizationId] });
      toast.success('Member unsuspended');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => orgApi.removeMember(organizationId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', organizationId] });
      toast.success('Member removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => orgApi.revokeInvitation(organizationId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] });
      toast.success('Invitation revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const members = membersQuery.data?.items ?? [];
  const pagination = membersQuery.data?.pagination;
  const pendingInvites = (invitationsQuery.data ?? []).filter((i: OrgInvitation) => i.status === 'PENDING');

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="People" description={pagination ? `${pagination.total} members in your organization` : 'Manage your team members and invitations'}>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus size={16} className="mr-2" />
          Invite
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="OWNER">Owner</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="COORDINATOR">Coordinator</SelectItem>
              <SelectItem value="MEMBER">Member</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Members table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div><Skeleton className="h-4 w-32" /><Skeleton className="mt-1 h-3 w-24" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <Users size={48} className="mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No team members yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Invite your first team member to get started.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setInviteOpen(true)}>
                      <Plus size={16} className="mr-2" />
                      Invite Member
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member: OrgMember) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {initials(member.user.firstName, member.user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{member.user.firstName} {member.user.lastName}</p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(member.role)}>{member.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(member.status)}>{member.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {timeAgo(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {member.role !== 'OWNER' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.status === 'ACTIVE' ? (
                              <DropdownMenuItem onClick={() => suspendMutation.mutate(member.id)}>
                                <UserX size={14} className="mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => unsuspendMutation.mutate(member.id)}>
                                <UserCheck size={14} className="mr-2" />
                                Unsuspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => removeMutation.mutate(member.id)}
                            >
                              <Trash2 size={14} className="mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Pending Invitations ({pendingInvites.length})
            </h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite: OrgInvitation) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invite.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {timeAgo(invite.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                          disabled={revokeInviteMutation.isPending}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>

      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={organizationId}
      />
    </AppShell>
  );
}
