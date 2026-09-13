import type { ReminderLevel, RequestStatus } from "@prisma/client";

// How many days after the due date each escalation level fires, indexed by
// how many reminders have already gone out. A request with remindersSent=0
// that has passed its due date is due for the first (GENTLE) reminder; once
// GENTLE has gone out, remindersSent=1 and we wait for the FIRM offset, etc.
// Once every level has fired, no further automatic action is taken — the
// request just sits flagged as overdue on the firm's dashboard.
export const ESCALATION_SCHEDULE: { level: ReminderLevel; dayOffset: number }[] = [
  { level: "GENTLE", dayOffset: 0 },
  { level: "FIRM", dayOffset: 3 },
  { level: "URGENT", dayOffset: 7 },
  { level: "ESCALATED_TO_FIRM", dayOffset: 12 },
];

export interface EscalationInput {
  status: RequestStatus;
  dueDate: Date;
  remindersSent: number;
}

export interface EscalationStep {
  level: ReminderLevel;
  dayOffset: number;
}

/**
 * Pure decision function: given a document request's current state and the
 * current time, returns the next escalation step to fire, or null if
 * nothing should happen yet (or ever, once the schedule is exhausted).
 */
export function nextEscalationStep(
  request: EscalationInput,
  now: Date = new Date(),
): EscalationStep | null {
  if (request.status !== "PENDING") return null;

  const stepIndex = request.remindersSent;
  if (stepIndex >= ESCALATION_SCHEDULE.length) return null;

  const step = ESCALATION_SCHEDULE[stepIndex];
  const fireAt = addDays(request.dueDate, step.dayOffset);
  if (now.getTime() < fireAt.getTime()) return null;

  return step;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}
