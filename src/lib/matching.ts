import type { DocumentType } from "@prisma/client";

// Below this confidence we never auto-match — the document just lands in
// the firm's review queue instead of silently (mis)closing a checklist item.
export const AUTO_MATCH_CONFIDENCE_THRESHOLD = 0.55;

export interface MatchCandidate {
  id: string;
  docType: DocumentType;
  period: string | null;
}

export interface ClassificationForMatching {
  docType: DocumentType | null;
  period: string | null;
  confidence: number;
}

export interface MatchResult {
  matchedId: string | null;
  needsReview: boolean;
}

/**
 * Matches a classified incoming document against a client's open
 * (PENDING) document requests. Pure function so the matching rules can be
 * unit tested without a database.
 */
export function matchDocumentToRequest(
  classification: ClassificationForMatching,
  candidates: MatchCandidate[],
): MatchResult {
  if (!classification.docType || classification.confidence < AUTO_MATCH_CONFIDENCE_THRESHOLD) {
    return { matchedId: null, needsReview: true };
  }

  const sameType = candidates.filter((c) => c.docType === classification.docType);
  if (sameType.length === 0) {
    return { matchedId: null, needsReview: true };
  }
  if (sameType.length === 1) {
    return { matchedId: sameType[0].id, needsReview: false };
  }

  // Several open requests share this document type (e.g. multiple monthly
  // bank statements) — the period is what disambiguates them.
  if (classification.period) {
    const target = normalizePeriod(classification.period);
    const periodMatch = sameType.find(
      (c) => c.period && periodsOverlap(target, normalizePeriod(c.period)),
    );
    if (periodMatch) {
      return { matchedId: periodMatch.id, needsReview: false };
    }
  }

  return { matchedId: null, needsReview: true };
}

function normalizePeriod(period: string): string {
  return period.trim().toLowerCase();
}

function periodsOverlap(a: string, b: string): boolean {
  return a === b || a.includes(b) || b.includes(a);
}
