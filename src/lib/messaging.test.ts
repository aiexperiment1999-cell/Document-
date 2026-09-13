import { describe, expect, it } from "vitest";
import { buildReminderMessage } from "./messaging";

const ctx = { clientName: "Jamie", label: "January bank statement", firmName: "Chen & Associates" };

describe("buildReminderMessage", () => {
  it("escalates tone across levels", () => {
    const gentle = buildReminderMessage("GENTLE", ctx);
    const firm = buildReminderMessage("FIRM", ctx);
    const urgent = buildReminderMessage("URGENT", ctx);
    const escalated = buildReminderMessage("ESCALATED_TO_FIRM", ctx);

    for (const msg of [gentle, firm, urgent]) {
      expect(msg).toContain(ctx.label);
    }
    expect(escalated).toContain(ctx.firmName);
    expect(escalated.toLowerCase()).toContain("internal notice");
  });
});
