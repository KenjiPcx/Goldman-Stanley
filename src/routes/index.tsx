import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Clock, Database, Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppNavDropdown } from "@/components/navigation/app-nav-dropdown";
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Background Images */}
      <div className="fixed inset-0 -z-10 bg-black">
        {/* Light mode background */}
        <div className="absolute inset-0 dark:opacity-0 opacity-100 transition-opacity duration-500">
          <img
            src="/light-bg-edited.png"
            alt="Light mode background"
            className="w-full h-full object-cover object-bottom"
          />
        </div>
        {/* Dark mode background */}
        <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-500">
          <img
            src="/dark-bg-2-edited.png"
            alt="Dark mode background"
            className="w-full h-full object-cover object-bottom"
          />
        </div>
        {/* Gradient overlay - solid at top to protect text, transparent at bottom to show buildings */}
        <div className="absolute inset-0 bg-gradient-to-b from-background from-0% via-background via-38% to-transparent transition-colors duration-500" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Building2 className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-primary/20 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Goldman Stanley
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1">AI Research Platform</span>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
            <AppNavDropdown />
            <SignedIn>
              <Link to="/research-chat">
                <Button variant="ghost">Research Chat</Button>
              </Link>
              <Link to="/datasets">
                <Button variant="ghost">Datasets</Button>
              </Link>
              <Link to="/office">
                <Button variant="ghost">Office 🏢</Button>
              </Link>
            </SignedIn>
            <ThemeToggle />
            <SignedOut>
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-8 py-12">
          <div className="space-y-5">
            <div className="inline-block">
              <CustomBadge className="mb-2 px-4 py-1 text-sm font-semibold">
                Powered by TanStack Start + Convex
              </CustomBadge>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Never Do
              <br />
              <span className="text-primary">Knowledge Work</span>
              <br />
              Again
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI agents that execute batch research in parallel.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center items-center pt-2">
            <Link to="/research-chat">
              <Button size="lg" className="h-12 px-6 text-base">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Research
              </Button>
            </Link>
            <Link to="/datasets">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                <Database className="mr-2 h-5 w-5" />
                View Datasets
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto mt-12 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Sparkles className="h-8 w-8" />}
            title="AI-Powered Research"
            description="Our agents use advanced AI models to conduct deep research, just like a team of analysts would."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Parallel Execution"
            description="Process hundreds of research tasks simultaneously with intelligent rate limiting and orchestration."
          />
          <FeatureCard
            icon={<Clock className="h-8 w-8" />}
            title="Real-time Monitoring"
            description="Watch your research progress in real-time with live status updates and results streaming."
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="relative border-t mt-20 py-4 bg-background/75 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-foreground/70">
          <p>© 2025 Goldman Stanley</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CustomBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 ${className}`}>
      {children}
    </span>
  );
}
