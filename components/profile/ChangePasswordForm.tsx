/**
 * Module: ChangePasswordForm
 * Layer:  web-component (client)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 3
 *
 * Purpose: Inline form for the profile page's "Change Password" menu item.
 *          Calls the backend's existing PUT /auth/change-password (already
 *          used by the mobile app -- no new backend endpoint needed here).
 *          Each field has its own show/hide toggle, matching the
 *          show/hide-password convention also used on the auth page (Phase 4).
 */
'use client';

import { useState, type FormEvent } from 'react';
import { authApi } from '@/lib/api';
import { Icons } from '@/lib/icons';

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  const Icon = show ? Icons.eyeOff : Icons.eye;

  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--fg-muted)]">
      {label}
      <span className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 pr-9 text-sm text-[var(--fg-primary)]"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
        >
          <Icon size={18} />
        </button>
      </span>
    </label>
  );
}

export function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('submitting');
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setStatus('success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      setStatus('idle');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-4">
      <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} />
      <PasswordField label="New password (min. 8 characters)" value={newPassword} onChange={setNewPassword} />
      {error && <p className="text-sm text-[var(--fg-clash)]">{error}</p>}
      {status === 'success' && <p className="text-sm text-[var(--fg-free-slot)]">Password changed successfully.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--fg-on-accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
        >
          {status === 'submitting' ? 'Saving…' : 'Save password'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
