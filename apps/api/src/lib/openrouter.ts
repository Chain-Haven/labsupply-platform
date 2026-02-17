/**
 * OpenRouter API Client for Compliance Analysis
 * Uses AI to analyze web page content for RUO compliance violations
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';

interface ComplianceViolationResult {
    type: 'health_claim' | 'dosage_advice' | 'brand_name_usage' | 'human_use_suggestion' | 'fda_violation' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    violatingText: string;
    description: string;
    suggestedFix: string;
}

interface AnalysisResult {
    violations: ComplianceViolationResult[];
    pageUrl: string;
}

interface IgnoredExample {
    violatingText: string;
    violationType: string;
    ignoreReason: string;
}

const SYSTEM_PROMPT = `You are an expert compliance analyst specializing in FDA regulations for Research Use Only (RUO) products. Your task is to analyze web page content from merchant websites that sell RUO peptides and research chemicals.

These products are strictly for RESEARCH USE ONLY and must NOT be marketed for human consumption, medical treatment, or clinical use.

## Violation Categories

1. **health_claim** - Any claim suggesting health benefits, therapeutic effects, disease treatment, or medical outcomes. Examples: "helps with weight loss", "treats diabetes", "improves health outcomes"

2. **dosage_advice** - Any dosage recommendations, administration instructions, or usage guidance implying human use. Examples: "recommended dose is 2.5mg", "inject subcutaneously", "take once weekly"

3. **brand_name_usage** - Use of trademarked pharmaceutical brand names that imply the product is the same as an FDA-approved drug. Flag these specific brand names: Tirzepatide, Mounjaro, Zepbound, Retatrutide, Semaglutide, Ozempic, Wegovy, Rybelsus, Liraglutide, Saxenda, Victoza, and any other FDA-approved drug brand names.

4. **human_use_suggestion** - Any language suggesting the product is intended for human consumption, injection, ingestion, or clinical use. Examples: "patients report", "users experience", "for personal use", "our customers feel"

5. **fda_violation** - Any violation of 21 CFR § 809.10(c)(2)(i) or other FDA regulations for RUO products. This includes missing "For Research Use Only" disclaimers, claims of FDA approval, or misrepresentation of product classification.

6. **other** - Any other compliance issue that falls outside the above categories but still represents a regulatory risk.

## Severity Levels

- **critical** - Direct health claims, dosage instructions for human use, or claims of FDA approval
- **high** - Brand name usage that implies equivalence to approved drugs, strong implications of human use
- **medium** - Subtle language that could be interpreted as suggesting human use, missing disclaimers
- **low** - Minor wording issues, borderline cases, overly promotional language

## Output Format

Return ONLY valid JSON with this exact structure:
{
  "violations": [
    {
      "type": "health_claim|dosage_advice|brand_name_usage|human_use_suggestion|fda_violation|other",
      "severity": "low|medium|high|critical",
      "violatingText": "exact text from the page that violates compliance",
      "description": "clear explanation of why this is a violation",
      "suggestedFix": "suggested compliant replacement text"
    }
  ]
}

If no violations are found, return: { "violations": [] }

Be thorough but avoid false positives. Standard scientific terminology used in a research context is acceptable. Focus on content that clearly crosses the line from research-oriented to consumer/patient-oriented language.`;

function buildFeedbackContext(ignoredExamples: IgnoredExample[]): string {
    if (ignoredExamples.length === 0) return '';

    const examples = ignoredExamples
        .slice(0, 10)
        .map((ex, i) =>
            `${i + 1}. Text: "${ex.violatingText}" (type: ${ex.violationType}) was flagged but IGNORED because: "${ex.ignoreReason}"`
        )
        .join('\n');

    return `\n\n## Previously Ignored Findings (Learn from these)
The following items were previously flagged but an admin determined they were NOT violations. Use these as calibration examples to avoid similar false positives:\n\n${examples}\n\nDo NOT flag content that is similar to the ignored examples above unless there is a clearly distinct and more severe compliance concern.`;
}

/**
 * Analyze a web page's content for RUO compliance violations.
 */
export async function analyzePageForCompliance(
    pageContent: string,
    pageUrl: string
): Promise<AnalysisResult> {
    return analyzeWithFeedback(pageContent, pageUrl, []);
}

/**
 * Analyze a web page with feedback from previously ignored violations.
 */
export async function analyzeWithFeedback(
    pageContent: string,
    pageUrl: string,
    ignoredExamples: IgnoredExample[]
): Promise<AnalysisResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    const truncatedContent = pageContent.slice(0, 12000);
    const feedbackContext = buildFeedbackContext(ignoredExamples);
    const systemPrompt = SYSTEM_PROMPT + feedbackContext;

    const userPrompt = `Analyze the following web page content for RUO compliance violations.

Page URL: ${pageUrl}

--- PAGE CONTENT START ---
${truncatedContent}
--- PAGE CONTENT END ---

Return your analysis as JSON only. No additional text or markdown formatting.`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://whitelabel.peptidetech.co',
                'X-Title': 'WhiteLabel Peptides Compliance Scanner',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.1,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content in OpenRouter response');
        }

        const parsed = JSON.parse(content);
        const violations: ComplianceViolationResult[] = (parsed.violations || []).map(
            (v: Record<string, unknown>) => ({
                type: v.type || 'other',
                severity: v.severity || 'medium',
                violatingText: String(v.violatingText || ''),
                description: String(v.description || ''),
                suggestedFix: String(v.suggestedFix || ''),
            })
        );

        return { violations, pageUrl };
    } catch (error) {
        console.error(`OpenRouter analysis failed for ${pageUrl}:`, error);
        throw error;
    }
}
