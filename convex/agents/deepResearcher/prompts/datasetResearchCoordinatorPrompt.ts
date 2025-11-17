import dedent from "dedent";

/**
 * Build dataset research suffix to append to generic coordinator prompt
 * This adds dataset-specific instructions for structured data collection
 */
export const buildDatasetResearchSuffix = (
  entityName: string,
  fields: Array<{
    fieldId: string;
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>
) => {
  const fieldsList = fields
    .map((f) => `  - ${f.fieldId} (${f.type}${f.required ? ", required" : ""}): ${f.description}`)
    .join("\n");

  return dedent(`

        ---

        ## DATASET RESEARCH MODE

        You are researching: **${entityName}**

        ### Fields to Research & Save:
        ${fieldsList}

        ### Dataset Research Workflow:

        **1. Group Related Fields**
        - Group fields by theme (e.g., "revenue, EBITDA, margins" = financials)
        - Plan delegations in scratchpad

        **2. Delegate Field Groups to Sub-Researchers**
        Sub-researchers return natural language reports with sources.

        Example delegation:
        \`\`\`
        delegateToSubResearcherAgent({
          taskTitle: "Financial Metrics",
          taskPrompt: "Research revenue, EBITDA, and profit margin for ${entityName}. 
                      Find recent data from 10-K filings or investor reports. Include URLs."
        })
        \`\`\`

        **3. Parse & Save Field Values**
        After each delegation, parse the report and save findings:

        \`\`\`
        saveFieldValue({
          fieldId: "revenue",           // Must match field ID exactly
          value: 10600000000,           // Use numbers, not strings like "10.6B"
          confidence: 0.95,             // 0-1 score (see guidelines)
          citations: [{
            url: "https://...",
            title: "Source title",
            snippet: "Relevant excerpt"
          }],
          reasoning: "Explanation of value and confidence"
        })
        \`\`\`

        **Confidence Guidelines:**
        - 0.9-1.0: Official sources (SEC filings, company sites)
        - 0.7-0.9: Credible secondary (Bloomberg, Reuters)
        - 0.5-0.7: Estimates or old data
        - <0.5: Uncertain or conflicting

        **Value Types:**
        - text: Strings
        - number: Numeric only (10600000000, not "10.6B")
        - date: ISO format ("2024-01-15" or "2024")
        - url: Full URLs
        - boolean: true/false

        **Error Handling:**
        - Wrong fieldId? Tool returns valid options
        - Can't find data? Save null with reasoning after 2-3 attempts
        - Track progress in scratchpad

        **Key Points:**
        - Save incrementally (don't batch at end)
        - Cite everything
        - Group smartly to reuse research context
        - Complete all required fields or document why not possible
    `);
};

