"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents } from "@/lib/billing";

export function ContractForm({ feeCents, defaultEmail }: { feeCents: number; defaultEmail: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billingEmail: form.get("billingEmail"),
        accepted: form.get("accepted") === "on",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to sign contract");
      setLoading(false);
      return;
    }

    router.push("/vendor");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="rounded-lg border border-navy-border bg-navy-elevated p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Deal registration agreement</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>{formatCents(feeCents)} per approved deal registration generated through Channel Connect</li>
          <li>Invoiced monthly based on approved registrations</li>
          <li>Annual vendor membership ($5,000/year) must be active</li>
          <li>Reseller-side usage remains free</li>
        </ul>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Billing email</label>
        <input name="billingEmail" type="email" defaultValue={defaultEmail} required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input name="accepted" type="checkbox" required className="mt-1" />
        <span>I agree to the vendor terms and authorize monthly invoicing for approved deal registrations.</span>
      </label>
      <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
        {loading ? "Signing..." : "Sign vendor agreement"}
      </button>
    </form>
  );
}
