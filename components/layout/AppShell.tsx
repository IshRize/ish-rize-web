import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-8 pt-14 md:px-6 md:pt-6">{children}</main>
    </div>
  );
}
