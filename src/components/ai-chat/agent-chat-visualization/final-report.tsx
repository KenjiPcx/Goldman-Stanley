"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck } from "lucide-react";
import { TextWithCitations } from "./text-with-citations";

interface FinalReportProps {
    researchNotes: string;
    citations?: Array<Record<string, string>>;
}

export function FinalReport({ researchNotes, citations }: FinalReportProps) {
    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="border-b flex-shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-600" />
                    Final Research Report
                    <Badge variant="default" className="ml-auto">Completed</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
                <TextWithCitations
                    text={researchNotes}
                    citations={citations}
                />
            </CardContent>
        </Card>
    );
}

