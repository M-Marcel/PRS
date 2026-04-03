'use client';

import { WalletInfo } from '@/components/wallet/WalletInfo';

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <WalletInfo />
      <div>
        <h1 className="mb-4 text-3xl font-bold">Presale Administration</h1>
        <p className="text-muted-foreground">
          Manage founders, control presale state, and trigger TGE.
        </p>
      </div>
      {/* TODO: Phase 6 -- FounderTable, RegisterFounderForm, PresaleControls, TGETrigger */}
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Admin panel components will be implemented in Phase 6.
        </p>
      </div>
    </div>
  );
}
