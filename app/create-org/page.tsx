'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Building2, Settings2, UserPlus, Check, Clock } from 'lucide-react';
import { orgApi, lastResponseTimeMs } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleSelectionStore } from '@/stores/scheduleSelectionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrgRole } from '@/types/scheduling';

const ORG_TYPES = [
  { value: 'UNIVERSITY', label: 'University / College' },
  { value: 'CHURCH', label: 'Church / Religious Org' },
  { value: 'EVENT', label: 'Event / Conference' },
  { value: 'OTHER', label: 'Other' },
];

const COMMON_TIMEZONES = [
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'UTC', label: 'UTC' },
];

function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 10);
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 10);
}

const STEPS = [
  { icon: Building2, label: 'Organization' },
  { icon: Settings2, label: 'Configuration' },
  { icon: UserPlus, label: 'Invite Team' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-8 ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {done ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-xs ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateOrgPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const { setOrganizationId } = useScheduleSelectionStore();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Org details
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [orgType, setOrgType] = useState('UNIVERSITY');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Step 3: Invite
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('MEMBER');

  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [createTime, setCreateTime] = useState<string | null>(null);
  const [inviteTime, setInviteTime] = useState<string | null>(null);

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login');
  }, [authLoading, isAuthenticated, router]);

  const createMutation = useMutation({
    mutationFn: () => orgApi.createOrganization({
      name,
      shortName: shortName.trim() || deriveShortName(name),
      orgType,
      timezone,
    }),
    onSuccess: (org) => {
      setCreatedOrgId(org.id);
      setOrganizationId(org.id);
      setCreateTime(lastResponseTimeMs);
      setError(null);
      setStep(2);
    },
    onError: (err: Error) => setError(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      const emails = inviteEmails
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'));
      if (emails.length === 0) return Promise.resolve([]);
      return orgApi.sendInvitations(createdOrgId!, { emails, role: inviteRole });
    },
    onSuccess: () => {
      setInviteTime(lastResponseTimeMs);
      router.push('/overview');
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleNext() {
    setError(null);
    if (step === 0) {
      if (!name.trim()) {
        setError('Organization name is required');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      createMutation.mutate();
    } else if (step === 2) {
      if (inviteEmails.trim()) {
        inviteMutation.mutate();
      } else {
        router.push('/overview');
      }
    }
  }

  if (authLoading || !isAuthenticated) return null;

  return (
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">IshRize</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your organization</p>
        </div>

        <StepIndicator current={step} />

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Organization details</CardTitle>
              <CardDescription>Tell us about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. University of Ghana Math Department"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!shortName || shortName === deriveShortName(name)) {
                      setShortName(deriveShortName(e.target.value));
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short-name">Short Name</Label>
                <Input
                  id="short-name"
                  placeholder="e.g. UGMD"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">Used for the URL slug. Auto-generated from the name.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={orgType} onValueChange={setOrgType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm & Create</CardTitle>
              <CardDescription>Review your organization details before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Short Name</span>
                  <span className="font-medium text-foreground">{shortName || deriveShortName(name)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">
                    {ORG_TYPES.find((t) => t.value === orgType)?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium text-foreground">{timezone}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;ll be the owner of this organization. You can invite team members and configure settings after setup.
              </p>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Invite your team</CardTitle>
              <CardDescription>Add team members now or skip and invite later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-emails">Email addresses</Label>
                <Textarea
                  id="invite-emails"
                  placeholder="Enter emails, one per line or comma-separated"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Default role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {createTime && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Organization created in {createTime}
          </p>
        )}

        <div className="mt-4 flex justify-between">
          {step > 0 && step < 2 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="ghost" onClick={() => router.push('/overview')}>
                Skip for now
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={createMutation.isPending || inviteMutation.isPending}
            >
              {(createMutation.isPending || inviteMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {step === 0 && 'Continue'}
              {step === 1 && (createMutation.isPending ? 'Creating...' : 'Create Organization')}
              {step === 2 && (inviteMutation.isPending ? 'Sending...' : 'Send & Finish')}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
