import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, type Config } from 'wagmi';
import { TARGET_CHAIN } from './chains';

let _config: Config | null = null;

export function getWagmiConfig(): Config {
  if (_config) return _config;

  _config = getDefaultConfig({
    appName: 'BlessUP Genesis Presale',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'placeholder',
    chains: [TARGET_CHAIN],
    transports: {
      [TARGET_CHAIN.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
    },
    ssr: true,
  });

  return _config;
}
