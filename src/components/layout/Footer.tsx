import Link from 'next/link';
import { TARGET_CHAIN } from '@/lib/chains';
import { getAddresses } from '@/lib/contracts';

function getBlockExplorerAddressUrl(address: string): string {
  const explorer = TARGET_CHAIN.blockExplorers?.default;
  if (!explorer) return '#';
  return `${explorer.url}/address/${address}`;
}

/**
 * Site footer with contract links, legal disclaimer, and social links.
 */
export function Footer() {
  const addresses = getAddresses();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              <span className="blessup-gradient-text">BlessUP</span> Network
            </h3>
            <p className="text-xs text-muted-foreground">
              Inspiring and rewarding billions of business souls through
              gamified referral marketing.
            </p>
          </div>

          {/* Contracts */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Contracts</h3>
            <div className="flex flex-col gap-1">
              <ContractLink
                label="ACTX Token"
                address={addresses.actxToken}
              />
              <ContractLink
                label="Presale"
                address={addresses.presale}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Network: {TARGET_CHAIN.name}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Resources</h3>
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
              <a
                href="https://blessup.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                BlessUP Network
              </a>
              <a
                href="https://naxum.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                NaXum Technologies
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 border-t border-border pt-4">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BlessUP Technologies. All rights reserved.
            ACTX tokens are utility tokens and are not investment products.
            Please read the terms and conditions before participating.
          </p>
        </div>
      </div>
    </footer>
  );
}

function ContractLink({ label, address }: { readonly label: string; readonly address: string }) {
  const isZeroAddress = address === '0x0000000000000000000000000000000000000000';

  if (isZeroAddress) {
    return (
      <span className="text-xs text-muted-foreground">
        {label}: <span className="italic">Not deployed</span>
      </span>
    );
  }

  return (
    <a
      href={getBlockExplorerAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}: {address.slice(0, 6)}...{address.slice(-4)}
    </a>
  );
}
