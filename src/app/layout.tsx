import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppProvider } from '@/providers/AppProvider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BlessUP Genesis Presale | ACTX Token',
  description:
    'Join the BlessUP Network Genesis Presale. Acquire ACTX tokens at founder pricing and help build the future of gamified referral marketing.',
  keywords: ['ACTX', 'BlessUP', 'presale', 'genesis', 'token', 'Base', 'Web3'],
  openGraph: {
    title: 'BlessUP Genesis Presale',
    description: 'Acquire ACTX tokens at founder pricing.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </AppProvider>
      </body>
    </html>
  );
}
