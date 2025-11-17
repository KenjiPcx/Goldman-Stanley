import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FileUIPart } from "ai";

export function useFileUpload() {
    const storeFileAction = useAction(api.messaging.chat.storeFileForMessage);

    const uploadFiles = async (files: FileUIPart[]) => {
        return await Promise.all(
            files.map(async (file) => {
                let arrayBuffer: ArrayBuffer;
                let mimeType: string;
                let fileName: string;

                // Handle FileUIPart format (has url, mediaType, filename)
                if ("url" in file && file.url && "mediaType" in file && "filename" in file) {
                    // Extract data from data URL if present
                    if (file.url.startsWith("data:")) {
                        // Parse data URL: data:mediaType;base64,data
                        const [header, base64Data] = file.url.split(",");
                        const mimeMatch = header.match(/data:([^;]+)/);
                        mimeType = mimeMatch ? mimeMatch[1] : (file.mediaType || "application/octet-stream");

                        // Convert base64 to ArrayBuffer
                        const binaryString = atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        arrayBuffer = bytes.buffer;
                    } else {
                        // If it's already a URL, fetch it
                        const response = await fetch(file.url);
                        arrayBuffer = await response.arrayBuffer();
                        mimeType = file.mediaType || "application/octet-stream";
                    }
                    fileName = file.filename || "file";
                } else {
                    // Handle File object format
                    const fileObj = file as unknown as File;
                    arrayBuffer = await fileObj.arrayBuffer();
                    mimeType = fileObj.type;
                    fileName = fileObj.name;
                }

                // Use storeFile through action to get URL (converts Excel to CSV automatically)
                const { url, converted } = await storeFileAction({
                    data: arrayBuffer,
                    mimeType,
                });

                // Show toast if Excel file was converted
                if (converted) {
                    toast.info(`${fileName} was converted from Excel to CSV format`, { duration: 3000 });
                }

                return {
                    url,
                    fileName,
                    mimeType: converted ? "text/csv" : mimeType,
                };
            })
        );
    };

    return { uploadFiles };
}

