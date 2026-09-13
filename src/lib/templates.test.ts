import { describe, expect, it } from "vitest";
import { CHECKLIST_TEMPLATES, getTemplate } from "./templates";

describe("checklist templates", () => {
  it("every template has at least one item with a positive due offset", () => {
    for (const template of CHECKLIST_TEMPLATES) {
      expect(template.items.length).toBeGreaterThan(0);
      for (const item of template.items) {
        expect(item.dueInDays).toBeGreaterThan(0);
      }
    }
  });

  it("getTemplate finds a known template and misses an unknown one", () => {
    expect(getTemplate(CHECKLIST_TEMPLATES[0].id)?.id).toBe(CHECKLIST_TEMPLATES[0].id);
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });
});
