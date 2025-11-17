import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardCheck, Edit, Trash2, Search } from "lucide-react";
import { ReviewConfigFormDialog } from "@/components/reviews/review-config-form-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppNavDropdown } from "@/components/navigation/app-nav-dropdown";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";

export default function ReviewsPage() {
    const reviewConfigs = useQuery(api.reviews.reviewConfigs.listReviewConfigs, {});
    const deleteReviewConfig = useMutation(api.reviews.reviewConfigs.deleteReviewConfig);

    const [searchTerm, setSearchTerm] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Doc<"reviewConfigs"> | null>(null);

    const filteredConfigs = reviewConfigs?.filter(
        (config) =>
            config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            config.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (configId: Id<"reviewConfigs">) => {
        if (confirm("Are you sure you want to delete this review config?")) {
            try {
                await deleteReviewConfig({ reviewConfigId: configId });
                toast.success("Review config deleted successfully");
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unknown error";
                toast.error(`Failed to delete config: ${message}`);
            }
        }
    };

    return (
        <>
            <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-3">
                        <span className="text-xl font-bold">Goldman Stanley</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <AppNavDropdown />
                    <ThemeToggle />
                </div>
            </header>
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Review Configurations</h1>
                        <p className="text-muted-foreground">
                            Manage quality control rubrics and review criteria
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Review Config
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search review configs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Review Config Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredConfigs?.map((config) => (
                        <Card key={config._id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-full bg-blue-500/10 p-2">
                                            <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{config.name}</CardTitle>
                                            <CardDescription className="text-sm mt-1">
                                                {config.description || "No description"}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Criteria */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Criteria</h4>
                                    <div className="space-y-1">
                                        {config.criteria.slice(0, 3).map((criterion) => (
                                            <div key={criterion.id} className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">{criterion.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {(criterion.weight * 100).toFixed(0)}%
                                                </Badge>
                                            </div>
                                        ))}
                                        {config.criteria.length > 3 && (
                                            <p className="text-xs text-muted-foreground">
                                                +{config.criteria.length - 3} more
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Passing Score */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Passing Score</h4>
                                    <Badge variant="secondary">
                                        {(config.overallPassingScore * 100).toFixed(0)}%
                                    </Badge>
                                </div>

                                {/* Stats */}
                                {(config.usageCount || 0) > 0 && (
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Uses:</span>{" "}
                                            <span className="font-semibold">{config.usageCount}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Pass Rate:</span>{" "}
                                            <span className="font-semibold">
                                                {((config.passRate || 0) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingConfig(config)}
                                        className="flex-1"
                                    >
                                        <Edit className="h-3 w-3 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(config._id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Empty State */}
                {filteredConfigs?.length === 0 && (
                    <div className="text-center py-12">
                        <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No review configs found</h3>
                        <p className="text-muted-foreground mb-4">
                            {searchTerm
                                ? "Try a different search term"
                                : "Get started by creating your first review configuration"}
                        </p>
                        {!searchTerm && (
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Review Config
                            </Button>
                        )}
                    </div>
                )}

                {/* Create/Edit Dialog */}
                <ReviewConfigFormDialog
                    open={createDialogOpen || !!editingConfig}
                    onClose={() => {
                        setCreateDialogOpen(false);
                        setEditingConfig(null);
                    }}
                    reviewConfig={editingConfig ?? undefined}
                />
            </div>
        </>
    );
}

