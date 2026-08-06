'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Mail, AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, we sent
              a password reset link.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Try a different email
              </Button>
              <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-1 inline h-3 w-3" />
                Back to sign in
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">IshRize</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reset your password
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Forgot password</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>

            <Link
              href="/login"
              className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 inline h-3 w-3" />
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
