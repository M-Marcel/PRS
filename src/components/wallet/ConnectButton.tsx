'use client';

import { useState, useEffect } from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

interface ConnectButtonProps {
  readonly showBalance?: boolean;
  readonly label?: string;
}

/**
 * Wrapper around RainbowKit's ConnectButton with BlessUP styling.
 * Provides wallet connection, chain switching, and account display.
 * SSR-safe: renders a placeholder button during server-side rendering.
 */
export function ConnectButton({ showBalance = false, label }: ConnectButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blessup-green)] px-6 text-sm font-semibold text-white opacity-50"
      >
        {label ?? 'Connect Wallet'}
      </button>
    );
  }

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const connected = mounted && account && chain;

        return (
          <div
            {...(!mounted && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none' as const,
                userSelect: 'none' as const,
              },
            })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--blessup-green)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--blessup-green-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label ?? 'Connect Wallet'}
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-destructive px-6 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Wrong Network
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {showBalance && account.displayBalance && (
                  <span className="text-sm text-muted-foreground">
                    {account.displayBalance}
                  </span>
                )}
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chain.hasIcon && chain.iconUrl && (
                    <img
                      alt={chain.name ?? 'Chain icon'}
                      src={chain.iconUrl}
                      className="h-4 w-4 rounded-full"
                    />
                  )}
                  <span>{account.displayName}</span>
                </button>
              </div>
            )}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
