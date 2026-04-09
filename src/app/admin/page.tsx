'use client';

import { useAdminWrite } from '@/hooks/useAdminWrite';
import { WalletInfo } from '@/components/wallet/WalletInfo';
import { AdminMetrics } from '@/components/admin/AdminMetrics';
import { FounderTable } from '@/components/admin/FounderTable';
import { PresaleControls } from '@/components/admin/PresaleControls';
import { TGETrigger } from '@/components/admin/TGETrigger';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/**
 * Admin panel page with tabbed sections.
 * Owns the useAdminWrite hook and passes relevant state down.
 */
export default function AdminPage() {
  const adminWrite = useAdminWrite();

  return (
    <div className="space-y-6">
      <WalletInfo />

      <div>
        <h1 className="mb-1 text-3xl font-bold">Presale Administration</h1>
        <p className="text-muted-foreground">
          Manage founders, control presale state, and trigger TGE.
        </p>
      </div>

      <Tabs defaultValue={0}>
        <TabsList>
          <TabsTrigger value={0}>Dashboard</TabsTrigger>
          <TabsTrigger value={1}>Founders</TabsTrigger>
          <TabsTrigger value={2}>Controls</TabsTrigger>
        </TabsList>

        <TabsContent value={0}>
          <AdminMetrics />
        </TabsContent>

        <TabsContent value={1}>
          <FounderTable adminWrite={adminWrite} />
        </TabsContent>

        <TabsContent value={2}>
          <div className="space-y-6">
            <PresaleControls adminWrite={adminWrite} />
            <TGETrigger adminWrite={adminWrite} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
