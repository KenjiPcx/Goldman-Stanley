import { FileUIPart } from "ai";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileAttachmentDisplayProps {
    fileParts: FileUIPart[];
    messageKey: string;
    role: "user" | "assistant" | "system";
}

export function FileAttachmentDisplay({ fileParts, messageKey, role }: FileAttachmentDisplayProps) {
    if (fileParts.length === 0) return null;

    // Get file extension and styling
    const getFileStyle = (filename: string, mimeType: string) => {
        const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
        
        if (mimeType.includes("csv") || mimeType.includes("spreadsheet")) {
            return { ext, color: "bg-emerald-500", textColor: "text-emerald-50" };
        } else if (mimeType.includes("pdf")) {
            return { ext, color: "bg-rose-500", textColor: "text-rose-50" };
        } else if (mimeType.startsWith("image/")) {
            return { ext, color: "bg-blue-500", textColor: "text-blue-50" };
        } else if (mimeType.includes("json")) {
            return { ext, color: "bg-amber-500", textColor: "text-amber-50" };
        } else if (mimeType.includes("text") || mimeType.includes("markdown")) {
            return { ext, color: "bg-violet-500", textColor: "text-violet-50" };
        }
        return { ext, color: "bg-slate-500", textColor: "text-slate-50" };
    };

    return (
        <div className={cn(
            "flex flex-wrap gap-2 mb-2",
            role === "assistant" ? "justify-start" : "justify-end"
        )}>
            {fileParts.map((filePart, fileIdx) => {
                const url = filePart.url;
                const filename = filePart.filename || "file";
                const mediaType = filePart.mediaType || "";
                
                if (!url) return null;

                const { ext, color, textColor } = getFileStyle(filename, mediaType);
                const displayName = filename.length > 20
                    ? filename.substring(0, 20) + '...'
                    : filename;

                return (
                    <a
                        key={`${messageKey}-file-${fileIdx}`}
                        href={url}
                        download={filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/50 transition-all hover:shadow-sm"
                        title={filename}
                    >
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded text-[10px] font-bold tracking-tight",
                            color,
                            textColor
                        )}>
                            {ext}
                        </div>
                        <span className="text-xs font-medium max-w-[140px] truncate">
                            {displayName}
                        </span>
                        <Download className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                );
            })}
        </div>
    );
}

