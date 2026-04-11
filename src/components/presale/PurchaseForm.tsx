'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useFounderStatus } from '@/hooks/useFounderStatus';
import { useUSDCBalance, useUSDCAllowance } from '@/hooks/useUSDC';
import { usePresaleWrite } from '@/hooks/usePresaleWrite';
import { calculateCost, formatACTX, formatUSDC } from '@/lib/formatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApproveButton } from './ApproveButton';
import { PurchaseButton } from './PurchaseButton';
import { PurchaseReceipt } from './PurchaseReceipt';
import { PriceDisplay } from './PriceDisplay';
import { AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

type FormStep = 'input' | 'approving' | 'purchasing' | 'completed';

/**
 * Main presale purchase form.
 *
 * Orchestrates the full purchase flow:
 * 1. Token amount input with live USDC cost
 * 2. USDC approval (if needed)
 * 3. Token purchase
 * 4. Receipt display
 */
export function PurchaseForm() {
  const { address } = useAccount();
  const founder = useFounderStatus();
  const { balance: usdcBalance, refetch: refetchBalance } = useUSDCBalance(address);
  const { allowance, refetch: refetchAllowance } = useUSDCAllowance(address);
  const presaleWrite = usePresaleWrite();

  const [inputValue, setInputValue] = useState('');
  const [step, setStep] = useState<FormStep>('input');

  // Parse the token amount from user input (whole numbers only)
  const parsedTokenAmount = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) <= 0) return 0n;
    const whole = Math.floor(Number(trimmed));
    if (whole <= 0) return 0n;
    return parseUnits(String(whole), 18);
  }, [inputValue]);

  // Calculate the USDC cost for the entered amount
  const usdcCost = useMemo(
    () => calculateCost(parsedTokenAmount, founder.tierPrice),
    [parsedTokenAmount, founder.tierPrice],
  );

  // Calculate the launch value at $0.10
  const launchValue = useMemo(() => {
    if (parsedTokenAmount === 0n) return '$0.00';
    const tokens = parseFloat(formatUnits(parsedTokenAmount, 18));
    const value = tokens * 0.10;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [parsedTokenAmount]);

  // Max tokens the user can purchase (minimum of token cap, USDC cap, and what they can afford)
  const maxTokens = useMemo(() => {
    if (founder.tierPrice === 0n) return 0n;
    // Max from USDC balance: (balance * 10^18) / pricePerToken
    const affordableTokens = (usdcBalance * parseUnits('1', 18)) / founder.tierPrice;
    // Max from USDC spend cap: (usdcCapRemaining * 10^18) / pricePerToken
    const usdcCapTokens = founder.tierPrice > 0n
      ? (founder.usdcCapRemaining * parseUnits('1', 18)) / founder.tierPrice
      : 0n;
    // Take minimum of all caps
    let max = founder.tokenCapRemaining;
    if (usdcCapTokens < max) max = usdcCapTokens;
    if (affordableTokens < max) max = affordableTokens;
    return max;
  }, [usdcBalance, founder.tierPrice, founder.usdcCapRemaining, founder.tokenCapRemaining]);

  // Validation
  const validation = useMemo(() => {
    if (parsedTokenAmount === 0n) return null; // No input yet

    if (parsedTokenAmount > founder.tokenCapRemaining) {
      return `Exceeds your remaining token cap of ${formatACTX(founder.tokenCapRemaining, 0)} ACTX`;
    }
    if (usdcCost > founder.usdcCapRemaining) {
      return `Exceeds your remaining USDC spend cap of ${formatUSDC(founder.usdcCapRemaining)}`;
    }
    if (usdcCost > usdcBalance) {
      return `Insufficient USDC (need ${formatUSDC(usdcCost)}, have ${formatUSDC(usdcBalance)})`;
    }
    return null;
  }, [parsedTokenAmount, founder.tokenCapRemaining, founder.usdcCapRemaining, usdcCost, usdcBalance]);

  const isInputValid = parsedTokenAmount > 0n && validation === null;
  const needsApproval = usdcCost > 0n && allowance < usdcCost;
  // Purchase is only safe when the on-chain allowance covers the cost
  const allowanceSufficient = usdcCost > 0n && allowance >= usdcCost;

  // Quick-fill handler
  const fillPercent = useCallback(
    (pct: number) => {
      if (maxTokens === 0n) return;
      const amount = (maxTokens * BigInt(pct)) / 100n;
      // Convert back to whole number for display
      const whole = Number(amount / parseUnits('1', 18));
      setInputValue(String(Math.max(1, whole)));
    },
    [maxTokens],
  );

  // Track the token amount at time of purchase for the toast/receipt
  const purchasedAmountRef = useRef(0n);

  // Approve handler
  const handleApprove = useCallback(() => {
    if (!isInputValid) return;
    setStep('approving');
    presaleWrite.approveUSDC(usdcCost);
  }, [isInputValid, presaleWrite, usdcCost]);

  // Purchase handler
  const handlePurchase = useCallback(() => {
    if (!isInputValid) return;
    purchasedAmountRef.current = parsedTokenAmount;
    setStep('purchasing');
    presaleWrite.purchaseTokens(parsedTokenAmount, founder.tierPrice);
  }, [isInputValid, presaleWrite, parsedTokenAmount, founder.tierPrice]);

  // Watch for approve confirmation → advance step
  useEffect(() => {
    if (step === 'approving' && presaleWrite.isApproveConfirmed) {
      setStep('input');
      refetchAllowance();
    }
  }, [step, presaleWrite.isApproveConfirmed, refetchAllowance]);

  // Watch for purchase confirmation → show receipt
  useEffect(() => {
    if (step === 'purchasing' && presaleWrite.isPurchaseConfirmed) {
      setStep('completed');
      refetchBalance();
      refetchAllowance();
      toast.success(`Successfully purchased ${formatACTX(purchasedAmountRef.current, 0)} ACTX!`);
    }
  }, [step, presaleWrite.isPurchaseConfirmed, refetchBalance, refetchAllowance]);

  // Handle reset (new purchase after completion)
  const handleNewPurchase = () => {
    setStep('input');
    setInputValue('');
    presaleWrite.reset();
  };

  // Presale not open state
  if (!founder.canPurchase && !founder.isLoading) {
    const reason = !founder.isWhitelisted
      ? 'You are not registered as a Genesis Founder.'
      : !founder.isQualified
        ? 'Complete the Genesis Sprint first.'
        : founder.tokenCapRemaining === 0n
          ? 'You have reached your purchase cap.'
          : 'The presale is not currently open.';

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold">Purchase Not Available</h3>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show receipt after successful purchase
  if (step === 'completed' && presaleWrite.purchaseHash) {
    return (
      <div className="space-y-4">
        <PurchaseReceipt
          purchaseHash={presaleWrite.purchaseHash}
          tokenAmount={parsedTokenAmount}
          usdcCost={usdcCost}
          tierName={founder.tierName}
        />
        {founder.tokenCapRemaining > 0n && (
          <Button variant="outline" onClick={handleNewPurchase} className="w-full">
            Make Another Purchase
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase ACTX</CardTitle>
        <PriceDisplay tierPrice={founder.tierPrice} tierName={founder.tierName} />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token amount input */}
        <div className="space-y-2">
          <Label htmlFor="token-amount">Amount (ACTX)</Label>
          <Input
            id="token-amount"
            type="number"
            min="1"
            step="1"
            placeholder="Enter token amount"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={step !== 'input'}
          />

          {/* Quick-fill buttons */}
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                onClick={() => fillPercent(pct)}
                disabled={step !== 'input' || maxTokens === 0n}
                className="flex-1 text-xs"
                aria-label={pct === 100 ? 'Fill maximum amount' : `Fill ${pct} percent of maximum`}
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </Button>
            ))}
          </div>

          {/* Remaining cap */}
          <p className="text-xs text-muted-foreground">
            Remaining cap: {formatACTX(founder.tokenCapRemaining, 0)} ACTX
          </p>
        </div>

        {/* Cost summary */}
        {parsedTokenAmount > 0n && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost</span>
              <span className="font-semibold">{formatUSDC(usdcCost)} USDC</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your USDC Balance</span>
              <span>{formatUSDC(usdcBalance)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Value at $0.10 launch</span>
              <span className="font-semibold text-[var(--blessup-green)]">{launchValue}</span>
            </div>
          </div>
        )}

        {/* Validation error */}
        {validation && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validation}</AlertDescription>
          </Alert>
        )}

        {/* Write hook error */}
        {presaleWrite.error && presaleWrite.error !== 'Transaction cancelled' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{presaleWrite.error}</AlertDescription>
          </Alert>
        )}

        {/* Two-step purchase flow */}
        {isInputValid && (
          <div className="space-y-4">
            {needsApproval && (
              <ApproveButton
                usdcAmount={usdcCost}
                isApproving={presaleWrite.isApproving}
                isApproveConfirming={presaleWrite.isApproveConfirming}
                isApproveConfirmed={presaleWrite.isApproveConfirmed}
                approveHash={presaleWrite.approveHash}
                onApprove={handleApprove}
                disabled={step === 'purchasing'}
              />
            )}

            <PurchaseButton
              tokenAmount={parsedTokenAmount}
              isPurchasing={presaleWrite.isPurchasing}
              isPurchaseConfirming={presaleWrite.isPurchaseConfirming}
              purchaseHash={presaleWrite.purchaseHash}
              onPurchase={handlePurchase}
              disabled={!allowanceSufficient}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
