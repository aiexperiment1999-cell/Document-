import { describe, expect, it } from "vitest";
import { addDays, nextEscalationStep } from "./escalation";

describe("nextEscalationStep", () => {
  const dueDate = new Date("2026-01-10T00:00:00Z");

  it("returns null for anything that isn't PENDING", () => {
    const step = nextEscalationStep(
      { status: "RECEIVED", dueDate, remindersSent: 0 },
      new Date("2026-02-01T00:00:00Z"),
    );
    expect(step).toBeNull();
  });

  it("returns null before the due date", () => {
    const step = nextEscalationStep(
      { status: "PENDING", dueDate, remindersSent: 0 },
      new Date("2026-01-05T00:00:00Z"),
    );
    expect(step).toBeNull();
  });

  it("fires GENTLE right at the due date", () => {
    const step = nextEscalationStep({ status: "PENDING", dueDate, remindersSent: 0 }, dueDate);
    expect(step?.level).toBe("GENTLE");
  });

  it("waits for the FIRM offset after one reminder", () => {
    const justAfterGentle = addDays(dueDate, 1);
    expect(
      nextEscalationStep({ status: "PENDING", dueDate, remindersSent: 1 }, justAfterGentle),
    ).toBeNull();

    const atFirmOffset = addDays(dueDate, 3);
    expect(
      nextEscalationStep({ status: "PENDING", dueDate, remindersSent: 1 }, atFirmOffset)?.level,
    ).toBe("FIRM");
  });

  it("progresses through URGENT and ESCALATED_TO_FIRM", () => {
    expect(
      nextEscalationStep(
        { status: "PENDING", dueDate, remindersSent: 2 },
        addDays(dueDate, 7),
      )?.level,
    ).toBe("URGENT");

    expect(
      nextEscalationStep(
        { status: "PENDING", dueDate, remindersSent: 3 },
        addDays(dueDate, 12),
      )?.level,
    ).toBe("ESCALATED_TO_FIRM");
  });

  it("stops firing once the schedule is exhausted", () => {
    const step = nextEscalationStep(
      { status: "PENDING", dueDate, remindersSent: 4 },
      addDays(dueDate, 100),
    );
    expect(step).toBeNull();
  });
});
