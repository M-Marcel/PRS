'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { NetworkGuard } from '@/components/wallet/NetworkGuard';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

/**
 * Client-side shell for the admin section.
 * Provides header, footer, network guard, and admin role gate.
 */
export function AdminShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <NetworkGuard>
        <AdminGate>{children}</AdminGate>
      </NetworkGuard>
      <Footer />
    </div>
  );
}

function AdminGate({ children }: { readonly children: React.ReactNode }) {
  const { isAdmin } = useIsAdmin();

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is restricted to authorized administrators.
              Your wallet address is not in the admin registry.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-[var(--blessup-gold)]" />
          <h2 className="text-lg font-semibold">Admin Panel</h2>
        </div>
      </div>
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
