"use client";

import { FormEvent, useState } from "react";

interface VendorSearchProps {
  resellers: { id: string; name: string }[];
}

export function VendorSearch({ resellers }: VendorSearchProps) {
  const [query, setQuery] = useState("");
  const [resellerId, setResellerId] = useState("");
  const [results, setResults] = useState<Array<{
    accountId: string;
    accountName: string;
    industry: string | null;
    useCase: string | null;
    reseller: { id: string; name: string };
    rep: { id: string; name: string; title: string | null; email: string };
    matchScore: number;
    matchReason: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setMessage("");

    const params = new URLSearchParams({ q: query });
    if (resellerId) params.set("resellerId", resellerId);

    const res = await fetch(`/api/accounts/search?${params}`);
    const data = await res.json();
    setResults(data.results ?? []);
    if (data.results?.length === 0) setMessage("No matching accounts found.");
    setLoading(false);
  }

  async function watchAccount(accountId: string) {
    await fetch("/api/accounts/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    setMessage("Account added to watch list.");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <select
          value={resellerId}
          onChange={(e) => setResellerId(e.target.value)}
          className="rounded-lg border border-navy-border px-3 py-2 text-sm"
        >
          <option value="">All resellers</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer or use case (e.g. Mythos security)"
          className="min-w-[240px] flex-1 rounded-lg border border-navy-border px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {message && <p className="text-sm text-slate-400">{message}</p>}

      {results.length > 0 && (
        <ul className="divide-y divide-slate-800 rounded-lg border border-navy-border">
          {results.map((r) => (
            <li key={r.accountId} className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-slate-100">{r.accountName}</p>
                <p className="text-sm text-slate-500">{r.reseller.name}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Rep: {r.rep.name}{r.rep.title ? ` · ${r.rep.title}` : ""} · {r.rep.email}
                </p>
                {r.useCase && <p className="mt-1 text-xs text-slate-500">Use case: {r.useCase}</p>}
                <p className="mt-1 text-xs text-brand-light">Match: {r.matchReason}</p>
              </div>
              <button
                type="button"
                onClick={() => watchAccount(r.accountId)}
                className="shrink-0 rounded-md border border-navy-border px-3 py-1.5 text-xs text-slate-300 hover:bg-brand-surface"
              >
                Watch
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
