"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCents, VENDOR_ANNUAL_FEE_CENTS } from "@/lib/billing";

export function AnnualFeeForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/billing/annual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billingEmail: form.get("billingEmail"),
        accepted: form.get("accepted") === "on",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Payment failed");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="rounded-lg border border-navy-border bg-navy-elevated p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Annual vendor membership</p>
        <p className="mt-2">{formatCents(VENDOR_ANNUAL_FEE_CENTS)} per year to list your company as a vendor on Channel Connect.</p>
        <p className="mt-2 text-slate-600">After payment, sign the deal registration agreement ({formatCents(50000)} per approved deal).</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Billing email</label>
        <input name="billingEmail" type="email" defaultValue={defaultEmail} required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input name="accepted" type="checkbox" required className="mt-1" />
        <span>I authorize the annual vendor membership charge (demo: recorded immediately).</span>
      </label>
      <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
        {loading ? "Processing..." : `Pay ${formatCents(VENDOR_ANNUAL_FEE_CENTS)} annual fee`}
      </button>
    </form>
  );
}
