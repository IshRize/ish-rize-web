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
import { schedulingApi, orgApi, sessionApi, lastResponseTimeMs } from '@/lib/api';
import { Download, Palette, CalendarCheck } from 'lucide-react';
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
  const [logoUrl, setLogoUrl] = useState('');
  const [accentPrimary, setAccentPrimary] = useState('');
  const [accentPrimaryHover, setAccentPrimaryHover] = useState('');
  const [accentSecondary, setAccentSecondary] = useState('');

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

  const configQuery = useQuery({
    queryKey: ['org-config', organizationId],
    queryFn: () => schedulingApi.getOrgConfig(organizationId),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (orgQuery.data) {
      setOrgName(orgQuery.data.name);
    }
  }, [orgQuery.data]);

  useEffect(() => {
    if (configQuery.data?.branding) {
      setLogoUrl(configQuery.data.branding.logoUrl ?? '');
      setAccentPrimary(configQuery.data.branding.accentPrimary ?? '');
      setAccentPrimaryHover(configQuery.data.branding.accentPrimaryHover ?? '');
      setAccentSecondary(configQuery.data.branding.accentSecondary ?? '');
    }
  }, [configQuery.data]);

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

  const brandingMutation = useMutation({
    mutationFn: async () => {
      const currentConfig = configQuery.data;
      if (!currentConfig) throw new Error('Config not loaded');
      const { orgType, branding: _old, ...profile } = currentConfig;
      const branding: Record<string, string> = {};
      if (logoUrl.trim()) branding.logoUrl = logoUrl.trim();
      if (accentPrimary.trim()) branding.accentPrimary = accentPrimary.trim();
      if (accentPrimaryHover.trim()) branding.accentPrimaryHover = accentPrimaryHover.trim();
      if (accentSecondary.trim()) branding.accentSecondary = accentSecondary.trim();
      return orgApi.updateOrganization(organizationId, {
        configProfile: { ...profile, branding: Object.keys(branding).length > 0 ? branding : undefined },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-config', organizationId] });
      toast.success('Branding saved');
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

  const [sessionGenResult, setSessionGenResult] = useState<string | null>(null);
  const generateSessionsMutation = useMutation({
    mutationFn: () => sessionApi.generateSessions(organizationId),
    onSuccess: (result) => {
      setSessionGenResult(`${result.created} created, ${result.skipped} already existed`);
      toast.success(`Generated ${result.created} sessions for today`);
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

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Branding
            </CardTitle>
            <CardDescription>Customize your organization&apos;s look — logo and accent colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="logo-url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="flex-1"
                />
                {logoUrl && (
                  <img src={logoUrl} alt="Preview" width={32} height={32} className="rounded object-contain" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Displayed in the sidebar. Use a square image for best results.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="accent-primary">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accent-primary"
                    placeholder="#6366f1"
                    value={accentPrimary}
                    onChange={(e) => setAccentPrimary(e.target.value)}
                  />
                  {accentPrimary && <div className="h-8 w-8 shrink-0 rounded border" style={{ backgroundColor: accentPrimary }} />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent-hover">Hover Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accent-hover"
                    placeholder="#4f46e5"
                    value={accentPrimaryHover}
                    onChange={(e) => setAccentPrimaryHover(e.target.value)}
                  />
                  {accentPrimaryHover && <div className="h-8 w-8 shrink-0 rounded border" style={{ backgroundColor: accentPrimaryHover }} />}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent-secondary">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accent-secondary"
                    placeholder="#818cf8"
                    value={accentSecondary}
                    onChange={(e) => setAccentSecondary(e.target.value)}
                  />
                  {accentSecondary && <div className="h-8 w-8 shrink-0 rounded border" style={{ backgroundColor: accentSecondary }} />}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => brandingMutation.mutate()} disabled={brandingMutation.isPending || !configQuery.data}>
                {brandingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Branding
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

        {/* Session Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Session Generation
            </CardTitle>
            <CardDescription>Create attendance sessions from today&apos;s scheduled bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Generates Session rows for all bookings scheduled today. Sessions already created for today are skipped.
                </p>
                {sessionGenResult && (
                  <p className="mt-1 text-xs text-muted-foreground">Last run: {sessionGenResult}</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => generateSessionsMutation.mutate()}
                disabled={generateSessionsMutation.isPending}
                className="shrink-0"
              >
                {generateSessionsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarCheck className="mr-2 h-4 w-4" />
                )}
                {generateSessionsMutation.isPending ? 'Generating...' : 'Generate Sessions'}
              </Button>
            </div>
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
