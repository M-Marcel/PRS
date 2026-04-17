'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePresaleState } from '@/hooks/usePresaleContract';
import { useVesting } from '@/hooks/useVesting';
import { logAdminAction } from '@/lib/adminAudit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminWriteOps {
  readonly triggerTGE: () => void;
  readonly tge: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
}

interface TGETriggerProps {
  readonly adminWrite: AdminWriteOps;
}

/**
 * Irreversible TGE trigger with 3-step confirmation dialog.
 * Only enabled when presale is closed and TGE has not been triggered.
 */
export function TGETrigger({ adminWrite }: TGETriggerProps) {
  const { address: adminAddress } = useAccount();
  const { data: presale } = usePresaleState();
  const { tgeTriggered } = useVesting();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirmText, setConfirmText] = useState('');

  const canTrigger = presale?.presaleClosed === true && tgeTriggered === false;
  const isProcessing = adminWrite.tge.isPending || adminWrite.tge.isConfirming;

  // Log audit after TGE confirms
  useEffect(() => {
    if (adminWrite.tge.isConfirmed && adminAddress) {
      logAdminAction({
        adminAddress,
        action: 'tge',
        txHash: adminWrite.tge.hash ?? undefined,
      });
      toast.success('TGE triggered successfully! 25% of tokens are now claimable.');
    }
  }, [adminWrite.tge.isConfirmed, adminWrite.tge.hash, adminAddress]);

  const handleConfirm = () => {
    adminWrite.triggerTGE();
    setDialogOpen(false);
    resetDialog();
  };

  const resetDialog = () => {
    setStep(1);
    setConfirmText('');
  };

  // Already triggered — show success state
  if (tgeTriggered || adminWrite.tge.isConfirmed) {
    return (
      <Card className="border-[var(--blessup-green)]/30">
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle2 className="h-5 w-5 text-[var(--blessup-green)]" />
          <div>
            <p className="font-semibold">TGE Has Been Triggered</p>
            <p className="text-sm text-muted-foreground">
              25% of presale tokens are now claimable by founders.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-base text-destructive">Trigger TGE</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This action is <strong>irreversible</strong>. It releases 25% of all presale tokens
          for immediate claiming by founders.
        </p>

        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetDialog(); }}>
          <DialogTrigger render={
            <Button
              variant="destructive"
              className="w-full"
              disabled={!canTrigger || isProcessing}
            />
          }>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!canTrigger ? 'Presale must be closed first' : 'Trigger TGE'}
          </DialogTrigger>

          <DialogContent showCloseButton={false}>
            {step === 1 && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Step 1 of 3: Warning</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to trigger the Token Generation Event?
                    This will immediately release 25% of all presale tokens for claiming.
                    This action <strong>cannot be undone</strong>.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button variant="destructive" onClick={() => setStep(2)}>
                    I Understand, Continue
                  </Button>
                </DialogFooter>
              </>
            )}

            {step === 2 && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Step 2 of 3: Confirm</DialogTitle>
                  <DialogDescription>
                    Type <strong>TRIGGER TGE</strong> below to confirm.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="TRIGGER TGE"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setStep(1); setConfirmText(''); }}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setStep(3)}
                    disabled={confirmText !== 'TRIGGER TGE'}
                  >
                    Continue
                  </Button>
                </DialogFooter>
              </>
            )}

            {step === 3 && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Step 3 of 3: Final Confirmation</DialogTitle>
                  <DialogDescription>
                    This is your last chance to cancel. Once confirmed, the TGE will be
                    triggered on the blockchain and <strong>cannot be reversed</strong>.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button variant="destructive" onClick={handleConfirm}>
                    Trigger TGE Now
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* TX status */}
        {adminWrite.tge.hash && (
          <TransactionStatus hash={adminWrite.tge.hash} label="Trigger TGE" />
        )}
      </CardContent>
    </Card>
  );
}
