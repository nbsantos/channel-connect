"use client";

import { FormEvent, useState } from "react";
import { DealRegisterForm } from "@/components/deal-register-form";

interface ResellerAccountSearchProps {
  resellerId: string;
  resellerName: string;
  vendorCompanyId: string;
  vendorUserId: string;
}

export function ResellerAccountSearch({ resellerId, resellerName, vendorCompanyId, vendorUserId }: ResellerAccountSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{
    accountId: string;
    accountName: string;
    rep: { id: string; name: string; title: string | null; email: string };
    useCase: string | null;
  }>>([]);
  const [selected, setSelected] = useState<{
    accountId: string;
    accountName: string;
    repId: string;
    repName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSelected(null);

    const params = new URLSearchParams({ q: query, resellerId });
    const res = await fetch(`/api/accounts/search?${params}`);
    const data = await res.json();
    setResults(
      (data.results ?? []).map((r: {
        accountId: string;
        accountName: string;
        rep: { id: string; name: string; title: string | null; email: string };
        useCase: string | null;
      }) => ({
        accountId: r.accountId,
        accountName: r.accountName,
        rep: r.rep,
        useCase: r.useCase,
      }))
    );
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an account at this reseller"
          className="min-w-[240px] flex-1 rounded-lg border border-navy-border px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {results.length > 0 && !selected && (
        <ul className="divide-y divide-slate-800 rounded-lg border border-navy-border">
          {results.map((r) => (
            <li key={r.accountId} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-100">{r.accountName}</p>
                <p className="text-sm text-slate-400">
                  Rep: {r.rep.name}{r.rep.title ? ` · ${r.rep.title}` : ""}
                </p>
                {r.useCase && <p className="text-xs text-slate-500">{r.useCase}</p>}
              </div>
              <button
                type="button"
                onClick={() => setSelected({ accountId: r.accountId, accountName: r.accountName, repId: r.rep.id, repName: r.rep.name })}
                className="rounded-md bg-brand-surface px-3 py-1.5 text-sm text-brand-light hover:bg-brand-dark"
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="rounded-lg border border-brand-dark bg-brand-surface p-4">
          <p className="text-sm font-medium text-brand-light">
            Selected: {selected.accountName} at {resellerName}
          </p>
          <p className="text-sm text-brand-light">Rep: {selected.repName}</p>
          <button type="button" onClick={() => setSelected(null)} className="mt-2 text-xs text-brand-light hover:underline">
            Change selection
          </button>
        </div>
      )}

      {selected && (
        <DealRegisterForm
          mode="vendor"
          companyId={vendorCompanyId}
          userId={vendorUserId}
          partners={[{ id: resellerId, name: resellerName }]}
          defaultPartnerId={resellerId}
          defaultAccountId={selected.accountId}
          defaultAssigneeId={selected.repId}
        />
      )}
    </div>
  );
}
