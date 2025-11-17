/**
 * Reviewer Agent - Quality control for research outputs
 * 
 * This agent reviews completed research (especially dataset cells) against a rubric
 * and provides specific, actionable feedback for improvements.
 */

import { Agent, stepCountIs } from "@convex-dev/agent";
import { components, internal } from "../_generated/api";
import { chatModelProviderOptions, smartChatModel } from "../ai.config";

export const reviewerAgent = new Agent(components.agent, {
    name: "Research Quality Reviewer",
    languageModel: smartChatModel,
    providerOptions: chatModelProviderOptions,
    stopWhen: [stepCountIs(50)],
});

/**
 * Default rubric for dataset research quality
 */
export const defaultDatasetRubric = {
    criteria: [
        {
            id: "completeness",
            name: "Completeness",
            description: "All required fields are filled with substantive information (not 'N/A' or 'Unknown')",
            weight: 0.3,
            passingScore: 0.8,
        },
        {
            id: "accuracy",
            name: "Accuracy & Citations",
            description: "Information has proper citations with URLs, snippets are relevant, sources are credible",
            weight: 0.3,
            passingScore: 0.8,
        },
        {
            id: "specificity",
            name: "Specificity",
            description: "Data is specific and detailed (e.g., exact numbers, dates, locations) rather than vague",
            weight: 0.2,
            passingScore: 0.7,
        },
        {
            id: "confidence",
            name: "Confidence Levels",
            description: "Confidence scores are appropriate (high for well-sourced data, lower for estimates)",
            weight: 0.2,
            passingScore: 0.7,
        },
    ],
    overallPassingScore: 0.75, // Must score 75% or higher overall to pass
};

export type Rubric = typeof defaultDatasetRubric;

export interface CriterionEvaluation {
    criterionId: string;
    score: number; // 0-1
    feedback: string;
    specificIssues: string[];
}

export interface ReviewResult {
    passed: boolean;
    overallScore: number; // 0-1
    summary: string;
    actionableRecommendations: string[];
    criteriaEvaluations: CriterionEvaluation[];
}

