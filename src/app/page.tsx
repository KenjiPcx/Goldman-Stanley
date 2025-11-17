"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Zap, Clock, Database } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BackgroundImage } from "@/components/theme/background-image";
import { AppNavDropdown } from "@/components/navigation/app-nav-dropdown";

export default function Home() {
    return (
        <div className="min-h-screen relative">
            {/* Background Images */}
            <div className="absolute inset-0 -z-10">
                {/* Light mode background */}
                <BackgroundImage
                    src="/light bg edited.PNG"
                    alt="Light mode background"
                    priority
                    className="dark:hidden"
                />
                {/* Dark mode background */}
                <BackgroundImage
                    src="/dark bg-2 edited.PNG"
                    alt="Dark mode background"
                    priority
                    className="hidden dark:block"
                />
                {/* Gradient overlay - solid at top to protect text, transparent at bottom to show buildings */}
                <div className="absolute inset-0 bg-gradient-to-b from-background from-0% via-background via-38% to-transparent transition-colors duration-500" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3">
                        <span className="text-2xl font-bold">Goldman Stanley</span>
                    </a>
                    <nav className="flex items-center gap-4">
                        <AppNavDropdown />
                        <a href="/research-chat">
                            <Button variant="ghost">Research Chat</Button>
                        </a>
                        <a href="/datasets">
                            <Button variant="ghost">Datasets</Button>
                        </a>
                        <ThemeToggle />
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center space-y-8 py-12">
                    <div className="space-y-6">
                        <div className="inline-block">
                            <Badge className="mb-4 px-4 py-1 text-sm font-semibold">
                                Powered by TanStack Start + Convex
                            </Badge>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
                            Never Do
                            <br />
                            <span className="text-primary">Knowledge Work</span>
                            <br />
                            Again
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Give us a prompt. Our AI agents execute batch research in parallel—like having an entire team at Goldman Sachs working for you.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex gap-4 justify-center items-center">
                        <a href="/research-chat">
                            <Button size="lg" className="h-14 px-8 text-lg">
                                <Sparkles className="mr-2 h-5 w-5" />
                                Start Research
                            </Button>
                        </a>
                        <a href="/datasets">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                                <Database className="mr-2 h-5 w-5" />
                                View Datasets
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="max-w-5xl mx-auto mt-24 grid md:grid-cols-3 gap-8">
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

                {/* How it Works */}
                <div className="max-w-4xl mx-auto mt-24 space-y-8">
                    <h2 className="text-3xl font-bold text-center">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <StepCard
                            number="1"
                            title="Give a Prompt"
                            description="Chat with our AI or directly define your research task and targets."
                        />
                        <StepCard
                            number="2"
                            title="Agents Execute"
                            description="Our AI agents work in parallel to research each target with deep analysis."
                        />
                        <StepCard
                            number="3"
                            title="Get Results"
                            description="View structured results in datasets, export to CSV, or integrate via API."
                        />
                    </div>
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

function StepCard({
    number,
    title,
    description,
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {number}
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function TechBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {children}
        </span>
    );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 ${className}`}>
            {children}
        </span>
    );
}

