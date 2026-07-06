"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Domain = { id: string; domain: string };

export function DomainManageForm({ companyId, initialDomains }: { companyId: string; initialDomains: Domain[] }) {
  const router = useRouter();
  const [domains, setDomains] = useState(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/companies/${companyId}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add domain");
      setLoading(false);
      return;
    }

    setDomains((prev) => [...prev, data.domain].sort((a, b) => a.domain.localeCompare(b.domain)));
    setNewDomain("");
    setLoading(false);
    router.refresh();
  }

  async function handleRemove(domainId: string) {
    setError("");
    const res = await fetch(`/api/companies/${companyId}/domains?domainId=${domainId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to remove domain");
      return;
    }
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-navy-border">
        {domains.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-800">@{d.domain}</span>
            <button type="button" onClick={() => handleRemove(d.id)} className="text-red-700 hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 rounded-lg border border-navy-border px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-light disabled:opacity-50">
          Add domain
        </button>
      </form>
      <p className="text-xs text-slate-500">Users with matching email domains can join your company for free.</p>
    </div>
  );
}
