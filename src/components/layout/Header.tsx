'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';
import type { NavLink } from '@/types';

const NAV_LINKS: ReadonlyArray<NavLink> = [
  { href: '/', label: 'Home', requiresAuth: false },
  { href: '/sprint', label: 'Genesis Sprint', requiresAuth: false },
  { href: '/presale', label: 'Presale', requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
];

const PUBLIC_LINKS = NAV_LINKS.filter((l) => !l.requiresAuth);

function NavContent({
  links,
  pathname,
}: {
  readonly links: ReadonlyArray<NavLink>;
  readonly pathname: string;
}) {
  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === link.href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden md:block">
          <ConnectButton showBalance />
        </div>
        <MobileNav links={links} currentPath={pathname} />
      </div>
    </>
  );
}

function WalletAwareNav({ pathname }: { readonly pathname: string }) {
  const { isConnected } = useAccount();

  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.requiresAuth || isConnected,
  );

  return <NavContent links={visibleLinks} pathname={pathname} />;
}

export function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">
            <span className="blessup-gradient-text">BlessUP</span>
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Genesis Presale
          </span>
        </Link>

        {mounted ? (
          <WalletAwareNav pathname={pathname} />
        ) : (
          <NavContent links={PUBLIC_LINKS} pathname={pathname} />
        )}
      </div>
    </header>
  );
}
