import { describe, expect, it } from "vitest";
import { matchDocumentToRequest, type MatchCandidate } from "./matching";

describe("matchDocumentToRequest", () => {
  it("flags for review when confidence is too low", () => {
    const result = matchDocumentToRequest(
      { docType: "W2", period: null, confidence: 0.3 },
      [{ id: "req-1", docType: "W2", period: null }],
    );
    expect(result).toEqual({ matchedId: null, needsReview: true });
  });

  it("flags for review when the classifier found nothing", () => {
    const result = matchDocumentToRequest(
      { docType: null, period: null, confidence: 0.9 },
      [{ id: "req-1", docType: "W2", period: null }],
    );
    expect(result.matchedId).toBeNull();
    expect(result.needsReview).toBe(true);
  });

  it("auto-matches the single open request of that type", () => {
    const candidates: MatchCandidate[] = [
      { id: "req-1", docType: "W2", period: "2025" },
      { id: "req-2", docType: "BANK_STATEMENT", period: "January 2026" },
    ];
    const result = matchDocumentToRequest({ docType: "W2", period: "2025", confidence: 0.8 }, candidates);
    expect(result).toEqual({ matchedId: "req-1", needsReview: false });
  });

  it("disambiguates multiple same-type requests using the period", () => {
    const candidates: MatchCandidate[] = [
      { id: "jan", docType: "BANK_STATEMENT", period: "January 2026" },
      { id: "feb", docType: "BANK_STATEMENT", period: "February 2026" },
    ];
    const result = matchDocumentToRequest(
      { docType: "BANK_STATEMENT", period: "February 2026", confidence: 0.7 },
      candidates,
    );
    expect(result).toEqual({ matchedId: "feb", needsReview: false });
  });

  it("flags for review when same-type candidates can't be disambiguated", () => {
    const candidates: MatchCandidate[] = [
      { id: "jan", docType: "BANK_STATEMENT", period: "January 2026" },
      { id: "feb", docType: "BANK_STATEMENT", period: "February 2026" },
    ];
    const result = matchDocumentToRequest(
      { docType: "BANK_STATEMENT", period: null, confidence: 0.9 },
      candidates,
    );
    expect(result).toEqual({ matchedId: null, needsReview: true });
  });

  it("flags for review when there is no open request of that type", () => {
    const candidates: MatchCandidate[] = [{ id: "req-1", docType: "W2", period: "2025" }];
    const result = matchDocumentToRequest(
      { docType: "RECEIPT", period: null, confidence: 0.9 },
      candidates,
    );
    expect(result).toEqual({ matchedId: null, needsReview: true });
  });
});
