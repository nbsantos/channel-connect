"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface DealRegisterFormProps {
  mode: "vendor" | "reseller";
  companyId: string;
  userId: string;
  partners: { id: string; name: string }[];
  defaultPartnerId?: string;
  defaultAccountId?: string;
  defaultAssigneeId?: string;
}

export function DealRegisterForm({
  mode,
  partners,
  defaultPartnerId,
  defaultAccountId,
  defaultAssigneeId,
}: DealRegisterFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        partnerId: form.get("partnerId"),
        accountId: form.get("accountId") || undefined,
        assigneeId: form.get("assigneeId") || undefined,
        initiator: mode,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Deal registered.");
      e.currentTarget.reset();
      router.push(`/deals/${data.deal.id}`);
      router.refresh();
    } else {
      setMessage(data.error || "Registration failed.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Deal title</label>
          <input name="title" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea name="description" required rows={3} className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {mode === "vendor" ? "Reseller" : "Vendor"}
          </label>
          <select name="partnerId" defaultValue={defaultPartnerId} required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2">
            <option value="">Select partner</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {defaultAccountId && (
          <input type="hidden" name="accountId" value={defaultAccountId} />
        )}
        {defaultAssigneeId && (
          <input type="hidden" name="assigneeId" value={defaultAssigneeId} />
        )}
      </div>
      <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
        {loading ? "Registering..." : "Register deal"}
      </button>
    </form>
  );
}
