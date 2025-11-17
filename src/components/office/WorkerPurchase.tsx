"use client";

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Minus, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WorkerPurchaseProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const WORKER_COST = 3; // $3 per worker

export default function WorkerPurchase({ open, onOpenChange }: WorkerPurchaseProps) {
    const [count, setCount] = useState(1);
    const purchasedWorkers = useQuery(api.concurrency.workQueue.getPurchasedWorkers);
    const purchaseWorkers = useMutation(api.concurrency.workQueue.purchaseWorkers);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const handlePurchase = async () => {
        if (count <= 0) {
            toast.error('Please select at least 1 worker');
            return;
        }

        setIsPurchasing(true);
        try {
            const result = await purchaseWorkers({ count });
            if (result.success) {
                toast.success(result.message);
                setCount(1); // Reset count
                onOpenChange(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Failed to purchase workers. Please try again.');
            console.error('Purchase error:', error);
        } finally {
            setIsPurchasing(false);
        }
    };

    const totalCost = count * WORKER_COST;
    // Default to 3 workers if not loaded yet (users start with 3 free workers)
    const currentWorkers = purchasedWorkers ?? 3;
    const newTotal = currentWorkers + count;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Purchase Workers
                    </DialogTitle>
                    <DialogDescription>
                        Expand your research team. Each worker can process tasks concurrently.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Current workers */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Current Workers</span>
                        </div>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                            {currentWorkers}
                        </Badge>
                    </div>

                    {/* Quantity selector */}
                    <div className="space-y-3">
                        <Label htmlFor="worker-count">Number of Workers</Label>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCount(Math.max(1, count - 1))}
                                disabled={count <= 1 || isPurchasing}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                id="worker-count"
                                type="number"
                                min="1"
                                value={count}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setCount(Math.max(1, val));
                                }}
                                className="text-center text-lg font-semibold"
                                disabled={isPurchasing}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCount(count + 1)}
                                disabled={isPurchasing}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Cost breakdown */}
                    <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Cost per worker</span>
                            <span className="font-medium">${WORKER_COST.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Quantity</span>
                            <span className="font-medium">{count}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex items-center justify-between">
                            <span className="font-semibold">Total Cost</span>
                            <span className="text-lg font-bold text-primary flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {totalCost.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* New total */}
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-sm font-medium">Workers After Purchase</span>
                        <Badge variant="default" className="text-lg px-3 py-1">
                            {newTotal}
                        </Badge>
                    </div>

                    {/* Purchase button */}
                    <Button
                        onClick={handlePurchase}
                        disabled={isPurchasing || count <= 0}
                        className="w-full"
                        size="lg"
                    >
                        {isPurchasing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Purchase {count} Worker{count !== 1 ? 's' : ''} for ${totalCost.toFixed(2)}
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        Workers are permanent and will appear in your office immediately after purchase.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

