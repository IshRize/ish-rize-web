'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Copy,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { schedulingApi, orgApi, lastResponseTimeMs } from '@/lib/api';
import { Download } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import type { FeatureFlag, OrgRole } from '@/types/scheduling';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { organizationId, setOrganizationId } = useScheduleSelectionStore();

  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [copied, setCopied] = useState(false);

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

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => orgApi.getOrganization(organizationId),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (orgQuery.data) {
      setOrgName(orgQuery.data.name);
    }
  }, [orgQuery.data]);

  const flagsQuery = useQuery({
    queryKey: ['featureFlags', organizationId],
    queryFn: () => orgApi.listFeatureFlags(organizationId),
    enabled: !!organizationId,
  });

  const updateOrgMutation = useMutation({
    mutationFn: () => orgApi.updateOrganization(organizationId, {
      name: orgName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      orgApi.toggleFeatureFlag(organizationId, key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureFlags', organizationId] });
      toast.success('Feature flag updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => orgApi.deactivateOrganization(organizationId),
    onSuccess: () => {
      toast.success('Organization deactivated');
      router.push('/overview');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orgApi.requestDeletion(organizationId, deletePassword),
    onSuccess: () => {
      toast.success('Deletion requested — takes effect after 30 days');
      setDeletePassword('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const transferMutation = useMutation({
    mutationFn: () => orgApi.transferOwnership(organizationId, {
      targetUserId: transferUserId,
      password: transferPassword,
    }),
    onSuccess: () => {
      toast.success('Ownership transferred');
      setTransferUserId('');
      setTransferPassword('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [exportTime, setExportTime] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: () => orgApi.exportOrgData(organizationId),
    onSuccess: () => {
      setExportTime(lastResponseTimeMs);
      toast.success('Organization data exported');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCopyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/accept-invite/${organizationId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading || !isAuthenticated) return null;

  return (
    <AppShell>
      <PageHeader title="Organization Settings" description="Configure your organization" />

      <div className="max-w-2xl space-y-6">
        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic organization information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="admin@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => updateOrgMutation.mutate()} disabled={updateOrgMutation.isPending}>
                {updateOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>Enable or disable features for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {flagsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading flags...</p>
            ) : (flagsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No feature flags configured.</p>
            ) : (
              <div className="space-y-4">
                {(flagsQuery.data ?? []).map((flag: FeatureFlag) => (
                  <div key={flag.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{flag.key.replace(/_/g, ' ')}</p>
                      {flag.description && (
                        <p className="text-xs text-muted-foreground">{flag.description}</p>
                      )}
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(enabled) => toggleFlagMutation.mutate({ key: flag.key, enabled })}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export (GDPR) */}
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Download all organization data as JSON (GDPR Article 20)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Export includes members, venues, hosts, bookings, calendars, groups, audit logs, and all other organization data.
                </p>
                {exportTime && (
                  <p className="mt-1 text-xs text-muted-foreground">Last export took {exportTime}</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="shrink-0"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {exportMutation.isPending ? 'Exporting...' : 'Export Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deactivate */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Deactivate Organization</p>
                <p className="text-sm text-muted-foreground">Freeze all access. Reversible by an admin.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-white">
                    Deactivate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate Organization</AlertDialogTitle>
                    <AlertDialogDescription>
                      All members will lose access immediately. You can reactivate later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deactivateMutation.mutate()}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            {/* Transfer */}
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">Transfer Ownership</p>
                <p className="text-sm text-muted-foreground">Transfer to another admin member.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Target user ID"
                  value={transferUserId}
                  onChange={(e) => setTransferUserId(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Your password"
                  value={transferPassword}
                  onChange={(e) => setTransferPassword(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => transferMutation.mutate()}
                disabled={!transferUserId || !transferPassword || transferMutation.isPending}
              >
                {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer
              </Button>
            </div>

            <Separator />

            {/* Delete */}
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">Delete Organization</p>
                <p className="text-sm text-muted-foreground">Permanent after 30-day grace period. All data will be removed.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    Delete Organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will schedule your organization for permanent deletion after 30 days.
                      You can cancel during the grace period.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="delete-password">Enter your password to confirm</Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-white hover:bg-destructive/90"
                      disabled={!deletePassword}
                    >
                      {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete Organization
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
