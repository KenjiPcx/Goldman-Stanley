import { createFileRoute } from '@tanstack/react-router'
import { PricingTable } from 'autumn-js/react'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

function PricingPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 space-y-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            Billing Plans
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Choose your research cadence</h1>
          <p className="text-lg text-muted-foreground">
            Powered by Autumn. Every plan bills purely on completed research tasks, and you can
            upgrade or downgrade at any time.
          </p>
        </div>

        <Card className="p-6">
          <PricingTable />
        </Card>

        <div className="text-sm text-muted-foreground">
          Questions about custom concurrency or enterprise data residency? Email{' '}
          <a className="underline" href="mailto:hello@goldmanstanley.ai">
            hello@goldmanstanley.ai
          </a>
          .
        </div>
      </div>
    </div>
  )
}
