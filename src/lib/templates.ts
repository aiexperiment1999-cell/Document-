import type { DocumentType } from "@prisma/client";

export interface ChecklistTemplateItem {
  docType: DocumentType;
  label: string;
  /** Days from today the item is due by default. */
  dueInDays: number;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistTemplateItem[];
}

// Three starter templates so most accountants aren't typing a checklist
// from scratch (PRD: "Per-client checklist... a few starter templates").
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "tax-season-individual",
    name: "Tax season — individual",
    items: [
      { docType: "W2", label: "W-2", dueInDays: 14 },
      { docType: "FORM_1099", label: "1099s (any)", dueInDays: 14 },
      { docType: "MORTGAGE_STATEMENT", label: "Mortgage interest statement (1098)", dueInDays: 14 },
      { docType: "TAX_RETURN_PRIOR_YEAR", label: "Prior year tax return", dueInDays: 7 },
      { docType: "ID_DOCUMENT", label: "Government ID", dueInDays: 7 },
    ],
  },
  {
    id: "monthly-bookkeeping",
    name: "Monthly bookkeeping",
    items: [
      { docType: "BANK_STATEMENT", label: "Bank statement", dueInDays: 5 },
      { docType: "RECEIPT", label: "Receipts for the month", dueInDays: 5 },
      { docType: "INVOICE", label: "Outstanding invoices", dueInDays: 5 },
    ],
  },
  {
    id: "new-client-onboarding",
    name: "New client onboarding",
    items: [
      { docType: "ID_DOCUMENT", label: "Government ID", dueInDays: 3 },
      { docType: "BANK_STATEMENT", label: "Most recent bank statement", dueInDays: 3 },
      { docType: "TAX_RETURN_PRIOR_YEAR", label: "Prior year tax return", dueInDays: 7 },
    ],
  },
];

export function getTemplate(id: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((t) => t.id === id);
}
