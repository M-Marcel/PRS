'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import type { NavLink } from '@/types';

interface MobileNavProps {
  readonly links: ReadonlyArray<NavLink>;
  readonly currentPath: string;
}

export function MobileNav({ links, currentPath }: MobileNavProps) {
  const isOpen = useAppStore((s) => s.isMobileNavOpen);
  const setOpen = useAppStore((s) => s.setMobileNavOpen);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const toggle = useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, [setOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && navRef.current) {
      const firstLink = navRef.current.querySelector<HTMLElement>('a, button');
      firstLink?.focus();
    }
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        onClick={toggle}
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 top-16 z-40">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />

          <nav
            ref={navRef}
            className="animate-slide-in-down relative z-50 border-b border-border bg-background p-4"
          >
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className={cn(
                    'rounded-md px-4 py-3 text-sm font-medium transition-colors',
                    currentPath === link.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <ConnectButton showBalance />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
