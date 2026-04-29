'use client';

import { Web3Provider } from './Web3Provider';
import { AuthProvider } from './AuthProvider';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </Web3Provider>
  );
}
