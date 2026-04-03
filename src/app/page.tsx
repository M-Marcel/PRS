import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Shield, Zap, Clock, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
          <Badge variant="secondary" className="mb-6">
            Genesis Presale
          </Badge>
          <h1 className="mb-4 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
            <span className="blessup-gradient-text">BlessUP</span> Genesis Founders
          </h1>
          <p className="mb-8 max-w-xl text-lg text-muted-foreground">
            Acquire ACTX tokens at exclusive founder pricing. Complete the Genesis
            Sprint, purchase at up to 50% below public price, and help build the
            future of gamified referral marketing.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/sprint"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--blessup-green)] px-8 text-base font-semibold text-white transition-colors hover:bg-[var(--blessup-green-dark)]"
            >
              Start Genesis Sprint
            </Link>
            <Link
              href="/presale"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-8 text-base font-semibold transition-colors hover:bg-accent"
            >
              View Presale
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step={1}
              icon={<Shield className="h-6 w-6" />}
              title="Verify Identity"
              description="Complete a quick KYC verification to join the Genesis Founders."
            />
            <StepCard
              step={2}
              icon={<Zap className="h-6 w-6" />}
              title="Complete Sprint"
              description="3 Mind Renewal sessions across 3 separate days to unlock access."
            />
            <StepCard
              step={3}
              icon={<TrendingUp className="h-6 w-6" />}
              title="Purchase ACTX"
              description="Buy tokens at founder pricing: $0.07 (Elite) or $0.05 (Legend)."
            />
            <StepCard
              step={4}
              icon={<Clock className="h-6 w-6" />}
              title="Claim & Vest"
              description="25% at TGE, 75% linear vest over 90 days with BSI multiplier boost."
            />
          </div>
        </section>

        {/* Tier Cards */}
        <section className="mx-auto grid max-w-4xl gap-6 px-4 pb-24 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-[var(--blessup-gold)]">Elite</span>
                <Badge variant="outline">Tier 1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-3xl font-bold">$0.07</p>
              <p className="text-sm text-muted-foreground">per ACTX (30% below public)</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Up to 10,000 ACTX per wallet</li>
                <li>25% unlocked at TGE</li>
                <li>75% vested over 90 days</li>
                <li>Maximum cost: $700 USDC</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-[var(--blessup-purple)]">Legend</span>
                <Badge variant="outline">Tier 2</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-3xl font-bold">$0.05</p>
              <p className="text-sm text-muted-foreground">per ACTX (50% below public)</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Up to 10,000 ACTX per wallet</li>
                <li>25% unlocked at TGE</li>
                <li>75% vested over 90 days with +0.1x BSI boost</li>
                <li>Maximum cost: $500 USDC</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  readonly step: number;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--blessup-green)]/10 text-[var(--blessup-green)]">
        {icon}
      </div>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">Step {step}</div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
