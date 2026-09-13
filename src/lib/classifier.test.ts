import { describe, expect, it } from "vitest";
import { parseClassification } from "./classifier";

describe("parseClassification", () => {
  it("parses a well-formed JSON response", () => {
    const raw = `{"docType": "W2", "period": "2025", "entity": "Acme Corp", "confidence": 0.92}`;
    const result = parseClassification(raw);
    expect(result.docType).toBe("W2");
    expect(result.period).toBe("2025");
    expect(result.entity).toBe("Acme Corp");
    expect(result.confidence).toBe(0.92);
  });

  it("extracts JSON even when the model wraps it in prose", () => {
    const raw = `Sure, here you go:\n{"docType": "RECEIPT", "period": null, "entity": null, "confidence": 0.6}\nHope that helps!`;
    const result = parseClassification(raw);
    expect(result.docType).toBe("RECEIPT");
    expect(result.confidence).toBe(0.6);
  });

  it("rejects an unknown docType", () => {
    const raw = `{"docType": "SOMETHING_MADE_UP", "confidence": 0.9}`;
    const result = parseClassification(raw);
    expect(result.docType).toBeNull();
  });

  it("clamps confidence into [0, 1]", () => {
    const raw = `{"docType": "W2", "confidence": 4.2}`;
    expect(parseClassification(raw).confidence).toBe(1);
  });

  it("degrades gracefully on unparseable input", () => {
    const result = parseClassification("not json at all");
    expect(result).toEqual({ docType: null, period: null, entity: null, confidence: 0, raw: "not json at all" });
  });
});
