import Anthropic from "@anthropic-ai/sdk";
import { DocumentType } from "@prisma/client";

// Short description of each document type, used both to build the prompt
// and to validate the model's answer against a known set of values.
const DOC_TYPE_GUIDE: Record<DocumentType, string> = {
  W2: "IRS Form W-2, Wage and Tax Statement",
  FORM_1099: "Any IRS Form 1099 variant (NEC, MISC, INT, DIV, etc.)",
  K1: "Schedule K-1 from a partnership, S-corp, or trust",
  BANK_STATEMENT: "Monthly bank or credit union account statement",
  RECEIPT: "A purchase receipt for a single transaction",
  INVOICE: "A bill or invoice issued to or by the client",
  PAYSTUB: "An employer pay stub / earnings statement",
  TAX_RETURN_PRIOR_YEAR: "A prior year's filed tax return",
  ID_DOCUMENT: "A government ID such as a driver's license or passport",
  MORTGAGE_STATEMENT: "A mortgage or Form 1098 mortgage interest statement",
  OTHER: "Anything that doesn't clearly fit the above",
};

export interface ClassificationResult {
  docType: DocumentType | null;
  period: string | null;
  entity: string | null;
  confidence: number;
  raw: string;
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

function buildPrompt(): string {
  const typeList = Object.entries(DOC_TYPE_GUIDE)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join("\n");

  return `You are helping an accounting firm classify a document a client just texted in.

Classify it as exactly one of these types:
${typeList}

Respond with ONLY a JSON object, no other text, matching this shape:
{"docType": "<ONE_OF_THE_TYPES_ABOVE>", "period": "<the period this document covers, e.g. '2025' or 'January 2026', or null if unclear>", "entity": "<the employer, bank, or business name printed on the document, or null>", "confidence": <number between 0 and 1>}`;
}

/**
 * Sends the image to Claude's vision model and returns a parsed, validated
 * classification. Network call — not covered by unit tests. The pure
 * parsing logic lives in parseClassification() below so it can be tested
 * against canned model responses.
 */
export async function classifyDocument(params: {
  mediaBase64: string;
  mediaContentType: string;
}): Promise<ClassificationResult> {
  const { mediaBase64, mediaContentType } = params;

  const response = await getClient().messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaContentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: mediaBase64,
            },
          },
          { type: "text", text: buildPrompt() },
        ],
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  return parseClassification(textBlock?.text ?? "{}");
}

/**
 * Pulls a JSON object out of the model's raw text response and validates
 * it against the known DocumentType values. Never throws — an unparseable
 * or malformed response just yields a null docType with zero confidence,
 * which routes the document to manual review.
 */
export function parseClassification(raw: string): ClassificationResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    const docType = isDocumentType(parsed.docType) ? parsed.docType : null;
    const confidence = typeof parsed.confidence === "number" ? clamp01(parsed.confidence) : 0;

    return {
      docType,
      period: typeof parsed.period === "string" ? parsed.period : null,
      entity: typeof parsed.entity === "string" ? parsed.entity : null,
      confidence,
      raw,
    };
  } catch {
    return { docType: null, period: null, entity: null, confidence: 0, raw };
  }
}

function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && value in DOC_TYPE_GUIDE;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
