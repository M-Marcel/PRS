'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getWagmiConfig } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 10_000,        // Poll contract reads every 10s
      staleTime: 5_000,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR/SSG rendering of wallet-dependent components.
  // RainbowKit requires WalletConnect projectId which is only available at runtime.
  if (!mounted) {
    return <>{children}</>;
  }

  const wagmiConfig = getWagmiConfig();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#10B981',    // BlessUP green
            borderRadius: 'medium',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
