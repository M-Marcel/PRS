'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePresaleState } from '@/hooks/usePresaleContract';
import { logAdminAction } from '@/lib/adminAudit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Play, Square, ShieldAlert, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

interface AdminWriteOps {
  readonly openPresale: () => void;
  readonly open: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
  readonly closePresale: () => void;
  readonly close: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
  readonly pause: () => void;
  readonly pauseOp: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
  readonly unpause: () => void;
  readonly unpauseOp: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
  readonly error: string | null;
}

interface PresaleControlsProps {
  readonly adminWrite: AdminWriteOps;
}

/**
 * Presale state controls: open, close, pause, unpause.
 * Each action requires a confirmation dialog before executing.
 */
export function PresaleControls({ adminWrite }: PresaleControlsProps) {
  const { address: adminAddress } = useAccount();
  const { data: presale, isLoading } = usePresaleState();

  // Log audit actions after TX confirms
  useEffect(() => {
    if (adminWrite.open.isConfirmed && adminAddress) {
      logAdminAction({ adminAddress, action: 'open', txHash: adminWrite.open.hash ?? undefined });
      toast.success('Presale opened');
    }
  }, [adminWrite.open.isConfirmed, adminWrite.open.hash, adminAddress]);

  useEffect(() => {
    if (adminWrite.close.isConfirmed && adminAddress) {
      logAdminAction({ adminAddress, action: 'close', txHash: adminWrite.close.hash ?? undefined });
      toast.success('Presale closed');
    }
  }, [adminWrite.close.isConfirmed, adminWrite.close.hash, adminAddress]);

  useEffect(() => {
    if (adminWrite.pauseOp.isConfirmed && adminAddress) {
      logAdminAction({ adminAddress, action: 'pause', txHash: adminWrite.pauseOp.hash ?? undefined });
      toast.success('Contract paused');
    }
  }, [adminWrite.pauseOp.isConfirmed, adminWrite.pauseOp.hash, adminAddress]);

  useEffect(() => {
    if (adminWrite.unpauseOp.isConfirmed && adminAddress) {
      logAdminAction({ adminAddress, action: 'unpause', txHash: adminWrite.unpauseOp.hash ?? undefined });
      toast.success('Contract unpaused');
    }
  }, [adminWrite.unpauseOp.isConfirmed, adminWrite.unpauseOp.hash, adminAddress]);

  if (isLoading || !presale) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading presale state...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Presale Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current state */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current State:</span>
          {presale.paused && <Badge variant="destructive">Paused</Badge>}
          {presale.tgeTriggered && <Badge className="bg-[var(--blessup-green)] text-white">TGE Triggered</Badge>}
          {presale.presaleClosed && !presale.tgeTriggered && <Badge variant="secondary">Closed</Badge>}
          {presale.presaleOpen && <Badge className="bg-[var(--blessup-green)] text-white">Open</Badge>}
          {!presale.presaleOpen && !presale.presaleClosed && !presale.tgeTriggered && (
            <Badge variant="outline">Not Started</Badge>
          )}
        </div>

        {/* Error display */}
        {adminWrite.error && adminWrite.error !== 'Transaction cancelled' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{adminWrite.error}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Open Presale */}
          <ConfirmDialog
            title="Open Presale"
            description="This will open the presale for purchases. Whitelisted founders with completed sprints will be able to buy ACTX tokens."
            onConfirm={() => {
              adminWrite.openPresale();
            }}
            disabled={presale.presaleOpen || presale.presaleClosed || adminWrite.open.isPending || adminWrite.open.isConfirming}
          >
            <Button variant="outline" className="w-full" disabled={presale.presaleOpen || presale.presaleClosed}>
              <Play className="mr-2 h-4 w-4" />
              Open Presale
            </Button>
          </ConfirmDialog>

          {/* Close Presale */}
          <ConfirmDialog
            title="Close Presale"
            description="This will close the presale. No more purchases will be accepted. You can trigger TGE after closing."
            onConfirm={() => {
              adminWrite.closePresale();
            }}
            disabled={!presale.presaleOpen || adminWrite.close.isPending || adminWrite.close.isConfirming}
          >
            <Button variant="outline" className="w-full" disabled={!presale.presaleOpen}>
              <Square className="mr-2 h-4 w-4" />
              Close Presale
            </Button>
          </ConfirmDialog>

          {/* Emergency Pause */}
          <PauseDialog
            onConfirm={() => {
              adminWrite.pause();
            }}
            disabled={presale.paused || adminWrite.pauseOp.isPending || adminWrite.pauseOp.isConfirming}
          >
            <Button variant="destructive" className="w-full" disabled={presale.paused}>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Emergency Pause
            </Button>
          </PauseDialog>

          {/* Unpause */}
          <ConfirmDialog
            title="Unpause Contract"
            description="This will unpause the contract and resume normal operations."
            onConfirm={() => {
              adminWrite.unpause();
            }}
            disabled={!presale.paused || adminWrite.unpauseOp.isPending || adminWrite.unpauseOp.isConfirming}
          >
            <Button variant="outline" className="w-full" disabled={!presale.paused}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Unpause
            </Button>
          </ConfirmDialog>
        </div>

        {/* TX status for any active operation */}
        {adminWrite.open.hash && <TransactionStatus hash={adminWrite.open.hash} label="Open Presale" />}
        {adminWrite.close.hash && <TransactionStatus hash={adminWrite.close.hash} label="Close Presale" />}
        {adminWrite.pauseOp.hash && <TransactionStatus hash={adminWrite.pauseOp.hash} label="Pause" />}
        {adminWrite.unpauseOp.hash && <TransactionStatus hash={adminWrite.unpauseOp.hash} label="Unpause" />}
      </CardContent>
    </Card>
  );
}

function ConfirmDialog({
  title,
  description,
  onConfirm,
  disabled,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly onConfirm: () => void;
  readonly disabled: boolean;
  readonly children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={disabled}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PauseDialog({
  onConfirm,
  disabled,
  children,
}: {
  readonly onConfirm: () => void;
  readonly disabled: boolean;
  readonly children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmText(''); }}>
      <DialogTrigger render={<span />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Emergency Pause</DialogTitle>
          <DialogDescription>
            This will immediately pause all contract operations. No purchases, claims, or admin
            actions will work until the contract is unpaused.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium">Type PAUSE to confirm:</p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="PAUSE"
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
              setConfirmText('');
            }}
            disabled={disabled || confirmText !== 'PAUSE'}
          >
            Confirm Emergency Pause
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
