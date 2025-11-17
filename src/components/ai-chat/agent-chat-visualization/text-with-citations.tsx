"use client";

import { Response } from "@/components/ai-elements/response";
import {
    InlineCitation,
    InlineCitationCard,
    InlineCitationCardTrigger,
    InlineCitationCardBody,
    InlineCitationCarousel,
    InlineCitationCarouselHeader,
    InlineCitationCarouselPrev,
    InlineCitationCarouselNext,
    InlineCitationCarouselIndex,
    InlineCitationCarouselContent,
    InlineCitationCarouselItem,
    InlineCitationSource,
    InlineCitationQuote,
} from "@/components/ai-elements/inline-citation";

interface TextWithCitationsProps {
    text: string;
    citations?: Array<Record<string, string>>;
}

export function TextWithCitations({ text, citations }: TextWithCitationsProps) {
    if (!citations || citations.length === 0) {
        return <Response>{text}</Response>;
    }

    const parts = text.split(/(\[\d+\])/);

    return (
        <div className="prose prose-sm max-w-none">
            <p className="leading-relaxed">
                {parts.map((part, index) => {
                    const citationMatch = part.match(/\[(\d+)\]/);
                    if (citationMatch) {
                        const citationId = citationMatch[1];
                        const citation = citations.find((c) => c.id === citationId);

                        if (citation) {
                            return (
                                <InlineCitation key={index}>
                                    <InlineCitationCard>
                                        <InlineCitationCardTrigger
                                            sources={citation.url ? [citation.url] : []}
                                        />
                                        <InlineCitationCardBody>
                                            <InlineCitationCarousel>
                                                <InlineCitationCarouselHeader>
                                                    <InlineCitationCarouselPrev />
                                                    <InlineCitationCarouselNext />
                                                    <InlineCitationCarouselIndex />
                                                </InlineCitationCarouselHeader>
                                                <InlineCitationCarouselContent>
                                                    <InlineCitationCarouselItem>
                                                        <InlineCitationSource
                                                            title={citation.title}
                                                            url={citation.url}
                                                            description={citation.type}
                                                        />
                                                        {citation.snippet && (
                                                            <InlineCitationQuote>
                                                                {citation.snippet}
                                                            </InlineCitationQuote>
                                                        )}
                                                    </InlineCitationCarouselItem>
                                                </InlineCitationCarouselContent>
                                            </InlineCitationCarousel>
                                        </InlineCitationCardBody>
                                    </InlineCitationCard>
                                </InlineCitation>
                            );
                        }
                    }
                    return part;
                })}
            </p>
        </div>
    );
}

