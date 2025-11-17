"use client";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    getFilteredRowModel,
    ColumnFiltersState,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState, useMemo, useCallback } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { ArrowUpDown, ExternalLink, Eye, Maximize2, X } from "lucide-react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataCell } from "@/components/ui/data-cell";
import { cn } from "@/lib/utils";

type TaskStatus = "queued" | "running" | "awaiting_input" | "completed" | "failed";

interface TaskExecution {
    _id: Id<"taskExecutions">;
    workflowName: string;
    status: TaskStatus;
    inputPrompt: string;
    startedAt: number;
    completedAt?: number;
    error?: string;
    report?: string;
    structuredOutput?: Record<string, string>;
    context?: {
        target?: string;
        outputFormat?: string;
        batchId?: string;
    };
}

interface EnrichedResearch {
    taskExecution: Doc<"taskExecutions">;
    row?: Doc<"datasetRows">;
    cellsByFieldId?: Record<string, Doc<"datasetCells">>;
}

interface SchemaField {
    fieldId: string;
    name: string;
    description: string;
    type: "text" | "number" | "date" | "url" | "boolean";
    required: boolean;
}

interface TaskExecutionsGridProps {
    enrichedResearch: EnrichedResearch[];
    schema?: SchemaField[];
    isFullscreen?: boolean;
    onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function TaskExecutionsGrid({
    enrichedResearch,
    schema,
    isFullscreen: controlledFullscreen,
    onFullscreenChange,
}: TaskExecutionsGridProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([]);
    const [internalFullscreen, setInternalFullscreen] = useState(false);

    // Use controlled or internal fullscreen state
    const isFullscreen = controlledFullscreen !== undefined ? controlledFullscreen : internalFullscreen;
    const setFullscreen = (value: boolean) => {
        if (onFullscreenChange) {
            onFullscreenChange(value);
        } else {
            setInternalFullscreen(value);
        }
    };

    // Calculate row-level completion stats
    const getRowCompletion = useCallback((taskExecution: TaskExecution) => {
        if (!schema || schema.length === 0) {
            return { filled: 0, total: 0, percentage: 0 };
        }

        const item = enrichedResearch.find(r => r.taskExecution._id === taskExecution._id);
        if (!item?.cellsByFieldId) {
            return { filled: 0, total: schema.length, percentage: 0 };
        }

        let filledCells = 0;
        schema.forEach(field => {
            const cell = item.cellsByFieldId?.[field.fieldId];
            if (cell && cell.value && cell.status === "completed") {
                filledCells++;
            }
        });

        return {
            filled: filledCells,
            total: schema.length,
            percentage: Math.round((filledCells / schema.length) * 100),
        };
    }, [schema, enrichedResearch]);

    // Convert enriched research to task executions for table display
    const displayData: TaskExecution[] = useMemo(() => {
        return enrichedResearch.map(item => item.taskExecution as TaskExecution);
    }, [enrichedResearch]);

    // Dynamically create columns based on schema
    const columns: ColumnDef<TaskExecution>[] = useMemo(() => {
        const cols: ColumnDef<TaskExecution>[] = [];

        // Always add Target column first (pinned/sticky)
        cols.push({
            id: "target",
            accessorKey: "context.target",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2"
                >
                    Target
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const target = row.original.context?.target || "N/A";
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="font-medium max-w-[180px] truncate cursor-help text-xs">
                                    {target}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{target}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        });

        // Add Progress column (also pinned)
        cols.push({
            id: "progress",
            accessorKey: "_id",
            header: "Progress",
            cell: ({ row }) => {
                const completion = getRowCompletion(row.original);
                const isComplete = completion.percentage === 100;
                const isEmpty = completion.percentage === 0;

                return (
                    <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1">
                            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500 ease-out",
                                        isComplete ? "bg-green-500" : isEmpty ? "bg-gray-300" : "bg-blue-500"
                                    )}
                                    style={{ width: `${completion.percentage}%` }}
                                />
                            </div>
                        </div>
                        <span className={cn(
                            "text-xs font-medium min-w-[45px] text-right",
                            isComplete ? "text-green-600" : isEmpty ? "text-muted-foreground" : "text-blue-600"
                        )}>
                            {completion.filled}/{completion.total}
                        </span>
                    </div>
                );
            },
        });

        // Add dynamic columns from schema with cell metadata
        if (schema && schema.length > 0) {
            schema.forEach((field) => {
                cols.push({
                    id: field.fieldId,
                    accessorFn: (row) => {
                        const item = enrichedResearch.find(r => r.taskExecution._id === row._id);
                        return item?.cellsByFieldId?.[field.fieldId]?.value || "N/A";
                    },
                    header: ({ column }) => (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                                        className="h-8 px-2"
                                    >
                                        {field.name}
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">{field.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ),
                    cell: ({ row }) => {
                        const item = enrichedResearch.find(r => r.taskExecution._id === row.original._id);
                        const cellData = item?.cellsByFieldId?.[field.fieldId];

                        if (!cellData) {
                            return <span className="text-xs text-muted-foreground">N/A</span>;
                        }

                        return (
                            <DataCell
                                value={cellData.value}
                                confidence={cellData.confidence}
                                citations={cellData.citations}
                                reasoning={cellData.reasoning}
                                status={cellData.status}
                                needsRefresh={cellData.needsRefresh}
                                className="text-xs"
                            />
                        );
                    },
                });
            });
        }

        // Add Status column
        cols.push({
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as TaskStatus;
                const statusColors: Record<TaskStatus, string> = {
                    queued: "bg-gray-500",
                    running: "bg-blue-500",
                    awaiting_input: "bg-yellow-500",
                    completed: "bg-secondary",
                    failed: "bg-red-500",
                };
                return (
                    <Badge variant="outline" className={`${statusColors[status]} text-xs px-2 py-0`}>
                        {status}
                    </Badge>
                );
            },
        });

        // Add Actions column
        cols.push({
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const task = row.original;
                return (
                    <div className="flex gap-1">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[90vh] w-[90vw]">
                                <DialogHeader>
                                    <DialogTitle>Task Execution Details</DialogTitle>
                                    <DialogDescription>
                                        Target: {task.context?.target || "N/A"}
                                    </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-[75vh]">
                                    <TaskDetailsView task={task} />
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                        {task.status === "completed" && task.report && (
                            <Link href={`/task-execution/${task._id}`} target="_blank">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                            </Link>
                        )}
                    </div>
                );
            },
        });

        return cols;
    }, [schema, enrichedResearch, getRowCompletion]);

    const table = useReactTable({
        data: displayData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFiltersState,
        state: {
            sorting,
            columnFilters,
        },
    });


    // Return fullscreen or normal view
    if (isFullscreen) {
        return (
            <div className={cn(
                "fixed inset-0 z-50 bg-background",
                "animate-in fade-in slide-in-from-bottom-4 duration-300"
            )}>
                <div className="h-full flex flex-col overflow-hidden">
                    {/* Fullscreen Header */}
                    <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    Research Results Grid
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {displayData.length} task executions • {schema?.length || 0} fields
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Filter by target..."
                                value={(table.getColumn("target")?.getFilterValue() as string) ?? ""}
                                onChange={(event) =>
                                    table.getColumn("target")?.setFilterValue(event.target.value)
                                }
                                className="w-64"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setFullscreen(false)}
                                className="rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Fullscreen Table */}
                    <div className="flex-1 overflow-auto min-h-0">
                        <div className="min-w-max">
                            <Table>
                                <TableHeader className="sticky top-0 z-30 shadow-sm">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead
                                                    key={header.id}
                                                    className="whitespace-nowrap py-2 px-3 text-xs border-r"
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected() && "selected"}
                                                className="hover:bg-accent transition-colors"
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell
                                                        key={cell.id}
                                                        className="py-3 px-3 whitespace-nowrap border-r"
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center"
                                            >
                                                No task executions found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                    <span>Extracted Research Results ({displayData.length})</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFullscreen(true)}
                        className="flex items-center gap-2"
                    >
                        <Maximize2 className="h-4 w-4" />
                        Expand
                    </Button>
                </CardTitle>
                <div className="pt-3">
                    <Input
                        placeholder="Filter by target..."
                        value={(table.getColumn("target")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("target")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="border rounded-md h-full overflow-auto">
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="sticky top-0 z-30 shadow-sm">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className="whitespace-nowrap py-2 px-3 text-xs border-r"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className="hover:bg-accent transition-colors"
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className="py-3 px-3 whitespace-nowrap border-r"
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center"
                                        >
                                            No task executions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TaskDetailsView({ task }: { task: TaskExecution }) {
    return (
        <div className="space-y-4 p-4">
            {/* Status and Basic Info */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge variant={
                        task.status === "completed" ? "default" :
                            task.status === "running" ? "secondary" :
                                task.status === "failed" ? "destructive" : "outline"
                    }>
                        {task.status}
                    </Badge>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Workflow:</span>
                    <span className="text-sm">{task.workflowName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium">Target:</span>
                    <span className="text-sm">{task.context?.target || "N/A"}</span>
                </div>
            </div>

            <Separator />

            {/* Structured Output - Show first if available */}
            {task.structuredOutput && Object.keys(task.structuredOutput).length > 0 && (
                <>
                    <div>
                        <label className="font-medium block mb-3">Extracted Data:</label>
                        <div className="space-y-3">
                            {Object.entries(task.structuredOutput).map(([key, value]) => (
                                <div key={key} className="border rounded-md p-3 bg-accent/50">
                                    <div className="font-medium text-sm mb-1">{key}</div>
                                    <div className="text-sm text-muted-foreground">{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Separator />
                </>
            )}

            {/* Report */}
            {task.report && (
                <div>
                    <label className="font-medium block mb-2">Full Report:</label>
                    <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {task.report}
                    </div>
                </div>
            )}

            {/* Error */}
            {task.error && (
                <>
                    <Separator />
                    <div>
                        <label className="font-medium block mb-2 text-destructive">Error:</label>
                        <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive">
                            {task.error}
                        </div>
                    </div>
                </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Started:</span>
                    <span>{new Date(task.startedAt).toLocaleString()}</span>
                </div>
                {task.completedAt && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span>{new Date(task.completedAt).toLocaleString()}</span>
                    </div>
                )}
                {task.completedAt && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>
                            {Math.floor((task.completedAt - task.startedAt) / 60000)}m{" "}
                            {Math.floor(((task.completedAt - task.startedAt) % 60000) / 1000)}s
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

