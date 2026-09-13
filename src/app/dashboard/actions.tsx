"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { CHECKLIST_TEMPLATES } from "@/lib/templates";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-stone-500 hover:text-stone-700"
    >
      Sign out
    </button>
  );
}

function useBusyAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(fn: () => Promise<Response>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return { busy, message, setMessage, run };
}

export function AddClientForm() {
  const { busy, message, run } = useBusyAction();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"SMS" | "WHATSAPP">("SMS");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await run(() =>
      fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, preferredChannel: channel }),
      }),
    );
    setName("");
    setPhone("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-stone-500">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-500">Phone (E.164)</label>
        <input
          required
          placeholder="+15551234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-500">Channel</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as "SMS" | "WHATSAPP")}
          className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        >
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add client"}
      </button>
      {message && <span className="text-sm text-red-600">{message}</span>}
    </form>
  );
}

export function ClientActions({
  clientId,
  remindersPaused,
}: {
  clientId: string;
  remindersPaused: boolean;
}) {
  const { busy, message, run } = useBusyAction();
  const [templateId, setTemplateId] = useState(CHECKLIST_TEMPLATES[0].id);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <select
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        className="rounded border border-stone-300 px-1.5 py-1"
      >
        {CHECKLIST_TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        disabled={busy}
        onClick={() =>
          run(() => fetch(`/api/clients/${clientId}/apply-template`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId }),
          }))
        }
        className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-50 disabled:opacity-50"
      >
        Apply template
      </button>
      <button
        disabled={busy}
        onClick={() =>
          run(() => fetch(`/api/clients/${clientId}/send-checklist`, { method: "POST" }))
        }
        className="rounded border border-brand-600 px-2 py-1 text-brand-700 hover:bg-brand-50 disabled:opacity-50"
      >
        Send checklist text
      </button>
      <button
        disabled={busy}
        onClick={() =>
          run(() =>
            fetch(`/api/clients/${clientId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ remindersPaused: !remindersPaused }),
            }),
          )
        }
        className="rounded border border-stone-300 px-2 py-1 hover:bg-stone-50 disabled:opacity-50"
      >
        {remindersPaused ? "Resume reminders" : "Pause reminders"}
      </button>
      {message && <span className="text-red-600">{message}</span>}
    </div>
  );
}

export function RequestStatusActions({
  requestId,
  status,
}: {
  requestId: string;
  status: "PENDING" | "RECEIVED" | "WAIVED";
}) {
  const { busy, message, run } = useBusyAction();

  async function setStatus(next: "PENDING" | "RECEIVED" | "WAIVED") {
    await run(() =>
      fetch(`/api/document-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      }),
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {status !== "RECEIVED" && (
        <button
          disabled={busy}
          onClick={() => setStatus("RECEIVED")}
          className="rounded border border-brand-600 px-1.5 py-0.5 text-brand-700 hover:bg-brand-50 disabled:opacity-50"
        >
          Mark received
        </button>
      )}
      {status !== "WAIVED" && (
        <button
          disabled={busy}
          onClick={() => setStatus("WAIVED")}
          className="rounded border border-stone-300 px-1.5 py-0.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          Waive
        </button>
      )}
      {status !== "PENDING" && (
        <button
          disabled={busy}
          onClick={() => setStatus("PENDING")}
          className="rounded border border-stone-300 px-1.5 py-0.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          Reopen
        </button>
      )}
      {message && <span className="text-red-600">{message}</span>}
    </div>
  );
}
