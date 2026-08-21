'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { PostHogProvider } from '@/components/posthog-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <PostHogProvider>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}
