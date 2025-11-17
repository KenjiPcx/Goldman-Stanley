import dedent from "dedent";
import type { Rubric, CriterionEvaluation } from "./reviewerAgent";

export function buildReviewerPrompt(
    entityName: string,
    fields: Array<{ fieldId: string; name: string; description: string; required: boolean }>,
    cells: Array<{ fieldId: string; value: any; confidence?: number; citations?: any[]; reasoning?: string }>,
    rubric: Rubric
): string {
    // Build field summaries
    const fieldSummaries = fields.map((field) => {
        const cell = cells.find((c) => c.fieldId === field.fieldId);
        const citationCount = cell?.citations?.length || 0;

        return dedent`
        ### ${field.name} (fieldId: ${field.fieldId})
        - **Required**: ${field.required ? "Yes" : "No"}
        - **Description**: ${field.description}
        - **Value**: ${cell?.value || "(empty)"}
        - **Confidence**: ${cell?.confidence !== undefined ? (cell.confidence * 100).toFixed(0) + "%" : "N/A"}
        - **Citations**: ${citationCount} source(s)
        ${cell?.reasoning ? `- **Agent Reasoning**: ${cell.reasoning}` : ""}
        ${cell?.citations && cell.citations.length > 0 ? `- **Sample Citation**: ${cell.citations[0].url}` : ""}
        `;
    }).join("\n\n");

    // Build rubric criteria
    const criteriaSummaries = rubric.criteria.map((criterion) => {
        return dedent`
        - **${criterion.name}** (weight: ${(criterion.weight * 100).toFixed(0)}%, passing: ${(criterion.passingScore * 100).toFixed(0)}%)
          ${criterion.description}
        `;
    }).join("\n");

    return dedent`
    You are a quality control reviewer for research data. Your job is to evaluate the research completed for "${entityName}" against a quality rubric and provide specific, actionable feedback.

    ## Your Task
    1. Review each field against the rubric criteria
    2. Assign scores (0-1) for each criterion
    3. Identify specific issues and improvements
    4. Decide if the research passes overall quality standards

    ## Research Data for: ${entityName}

    ${fieldSummaries}

    ## Quality Rubric

    ${criteriaSummaries}

    **Overall Passing Score**: ${(rubric.overallPassingScore * 100).toFixed(0)}%

    ## Evaluation Guidelines

    ### Completeness (${(rubric.criteria[0].weight * 100).toFixed(0)}%)
    - Are all required fields filled?
    - Are values substantive (not just "N/A" or "Unknown")?
    - Is there enough detail to be useful?

    ### Accuracy & Citations (${(rubric.criteria[1].weight * 100).toFixed(0)}%)
    - Does each field have proper citations?
    - Are citation URLs valid and relevant?
    - Are sources credible (official websites, news, financial databases)?
    - Do citation snippets support the stated value?

    ### Specificity (${(rubric.criteria[2].weight * 100).toFixed(0)}%)
    - Are numbers exact (e.g., "$2.4B" not "billions")?
    - Are dates specific (e.g., "March 2024" not "recently")?
    - Are locations complete (e.g., "New York, NY, USA" not just "NY")?
    - Is information detailed vs vague?

    ### Confidence Levels (${(rubric.criteria[3].weight * 100).toFixed(0)}%)
    - Are confidence scores appropriate?
    - High confidence (>0.8) for direct, well-sourced facts
    - Medium confidence (0.5-0.8) for inferred or partial info
    - Low confidence (<0.5) for estimates or uncertain data

    ## Output Format

    You must call the \`submitReview\` tool with your evaluation. For each criterion, provide:
    - A score from 0 to 1 (where 1 is perfect)
    - Specific feedback explaining the score
    - List of specific issues found (if any)

    ## Example Issues to Look For

    **Completeness Issues:**
    - "Revenue field is empty but marked required"
    - "CEO name is 'Unknown' - this should be findable"

    **Accuracy Issues:**
    - "Website URL has no citation"
    - "Revenue figure doesn't match citation snippet"
    - "Citation is from social media, not authoritative source"

    **Specificity Issues:**
    - "Founded year is 'early 2000s' - find exact year"
    - "Headquarters is just 'California' - get full address"
    - "Revenue is 'approximately $1B' - find exact figure"

    **Confidence Issues:**
    - "Confidence is 95% but only one citation and it's vague"
    - "Confidence is 40% but data looks well-sourced - should be higher"

    ## Important
    - Be thorough but fair
    - Provide actionable feedback (tell them what to fix, not just what's wrong)
    - If data is genuinely unavailable, that's acceptable for optional fields
    - Focus on high-impact improvements
    
    Now evaluate the research data above.
    `;
}

