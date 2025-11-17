import { Link, createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useOfficeData } from '@/hooks/useOfficeData';
import OfficeSimulation from '@/components/office/OfficeSimulation';
import { Home, MessageSquare, DollarSign, Info, Users } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { UserButton } from '@clerk/clerk-react';
import { PricingTable } from 'autumn-js/react';
import WorkerPurchase from '@/components/office/WorkerPurchase';
import { CreditsDisplay } from '@/components/navigation/CreditsDisplay';

export const Route = createFileRoute('/office')({
    component: OfficePage,
});

function OfficePage() {
    const { employees, desks, officeStats, officeQna, isLoading } = useOfficeData();
    const [isQnaModalOpen, setQnaModalOpen] = useState(false);
    const [isPricingModalOpen, setPricingModalOpen] = useState(false);
    const [isWorkerPurchaseOpen, setWorkerPurchaseOpen] = useState(false);
    const { user } = useUser();
    const userId = user?.tokenIdentifier;
    const concurrencyStatus = useQuery(
        api.concurrency.workQueue.getUserConcurrencyStatus,
        userId ? { userId } : 'skip'
    );

    if (isLoading) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center">
                <div className="text-lg text-muted-foreground">Loading office data...</div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen">
            {/* Minimal Floating Navbar */}
            <nav className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-full shadow-lg border border-gray-200/50 dark:border-gray-800/50">
                <div className="flex items-center gap-2 px-4 py-2">
                    <Link to="/">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <Home className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link to="/research-chat">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setWorkerPurchaseOpen(true)}
                        title="Purchase Workers"
                    >
                        <Users className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setPricingModalOpen(true)}
                        title="Pricing Plans"
                    >
                        <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setQnaModalOpen(true)}
                    >
                        <Info className="h-4 w-4" />
                    </Button>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                    <CreditsDisplay />

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                    <UserButton afterSignOutUrl="/" />
                </div>
            </nav>

            {/* Stats overlay */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4 space-y-2">
                <h2 className="text-lg font-bold">Goldman Stanley Office</h2>
                {officeStats && (
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span>Total Tasks:</span>
                            <Badge variant="secondary">{officeStats.totalTasks}</Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Active:</span>
                            <Badge variant="default">{officeStats.activeTasks}</Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Completed:</span>
                            <Badge className="bg-green-500">{officeStats.completedTasks}</Badge>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Failed:</span>
                            <Badge variant="destructive">{officeStats.failedTasks}</Badge>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4 space-y-2">
                <h3 className="text-sm font-bold">Legend</h3>
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Idle</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Walking</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span>Working</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Busy</span>
                    </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Click on employees or desks to view task logs
                </p>
            </div>

            {/* Office simulation with 3D scene and interactions */}
            <OfficeSimulation employees={employees} desks={desks} />

            {/* Q&A modal */}
            <Dialog open={isQnaModalOpen} onOpenChange={setQnaModalOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>How This Office Works</DialogTitle>
                        <DialogDescription>
                            Reference guide covering task mapping, concurrency, pricing, and agent integrations.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                        {officeQna ? (
                            <div className="space-y-6">
                                <p className="text-sm text-muted-foreground">{officeQna.summary}</p>
                                {officeQna.entries.map((entry) => (
                                    <div
                                        key={entry.question}
                                        className="border rounded-lg p-4 bg-muted/40 space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <h4 className="text-base font-semibold">{entry.question}</h4>
                                            <Badge variant="outline">{entry.category}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{entry.answer}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Last updated {new Date(entry.lastUpdated).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                                Loading office knowledge…
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Worker Purchase Modal */}
            <WorkerPurchase open={isWorkerPurchaseOpen} onOpenChange={setWorkerPurchaseOpen} />

            {/* Pricing modal */}
            <Dialog open={isPricingModalOpen} onOpenChange={setPricingModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Choose your research cadence</DialogTitle>
                        <DialogDescription>
                            Powered by Autumn. Every plan bills purely on completed research tasks, and you can
                            upgrade or downgrade at any time.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[70vh] pr-4">
                        <Card className="p-6">
                            <PricingTable />
                        </Card>
                        <div className="text-sm text-muted-foreground mt-4">
                            Questions about custom concurrency or enterprise data residency? Email{' '}
                            <a className="underline" href="mailto:hello@goldmanstanley.ai">
                                hello@goldmanstanley.ai
                            </a>
                            .
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl bg-muted/40 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-base font-semibold">{value}</p>
        </div>
    );
}
