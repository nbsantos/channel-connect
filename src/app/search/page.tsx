"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("accounts");
  const [accounts, setAccounts] = useState<Array<{
    accountId: string;
    accountName: string;
    reseller: { name: string };
    rep: { name: string; email: string };
    matchReason: string;
  }>>([]);
  const [vendors, setVendors] = useState<Array<{
    vendor: { id: string; name: string; description: string | null; useCases: string[] };
    contact: { name: string; email: string } | null;
    matchScore: number;
  }>>([]);
  const [repMatch, setRepMatch] = useState<{
    accountName: string;
    rep: { name: string; email: string };
    reseller: { name: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setAccounts([]);
    setVendors([]);
    setRepMatch(null);

    const params = new URLSearchParams({ q: query, type: searchType });
    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();

    if (searchType === "vendors") setVendors(data.vendors ?? []);
    else if (searchType === "rep") setRepMatch(data.match ?? null);
    else setAccounts(data.accounts ?? []);

    setLoading(false);
  }

  async function watchAccount(accountId: string) {
    await fetch("/api/accounts/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">AI Search</h1>
        <p className="mt-1 text-sm text-slate-400">
          Search by customer name, use case, or vendor capability. Modular AI layer for partner discovery and rep matching.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="rounded-lg border border-navy-border px-3 py-2 text-sm"
        >
          <option value="accounts">Account / use case search</option>
          <option value="vendors">Vendor by use case</option>
          <option value="rep">Rep matching</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchType === "vendors"
              ? "e.g. cloud security, compliance"
              : searchType === "rep"
                ? "Account name"
                : "Customer or use case"
          }
          className="min-w-[280px] flex-1 rounded-lg border border-navy-border px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {accounts.length > 0 && (
        <section className="rounded-xl border border-navy-border bg-navy-elevated p-6">
          <h2 className="font-semibold text-slate-100">Matching accounts</h2>
          <ul className="mt-4 divide-y divide-slate-800">
            {accounts.map((a) => (
              <li key={a.accountId} className="flex items-start justify-between py-3">
                <div>
                  <p className="font-medium">{a.accountName}</p>
                  <p className="text-sm text-slate-500">{a.reseller.name} · Rep: {a.rep.name}</p>
                  <p className="text-xs text-brand-light">{a.matchReason}</p>
                </div>
                <button type="button" onClick={() => watchAccount(a.accountId)} className="text-xs text-slate-400 hover:text-brand-light">
                  Watch
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vendors.length > 0 && (
        <section className="rounded-xl border border-navy-border bg-navy-elevated p-6">
          <h2 className="font-semibold text-slate-100">Matching vendors</h2>
          <ul className="mt-4 divide-y divide-slate-800">
            {vendors.map((v) => (
              <li key={v.vendor.id} className="py-3">
                <Link href={`/company/${v.vendor.id}`} className="font-medium text-brand-light hover:underline">
                  {v.vendor.name}
                </Link>
                {v.vendor.description && <p className="text-sm text-slate-400">{v.vendor.description}</p>}
                {v.vendor.useCases.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Use cases: {v.vendor.useCases.join(", ")}</p>
                )}
                {v.contact && <p className="mt-1 text-sm text-slate-500">Contact: {v.contact.name}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {repMatch && (
        <section className="rounded-xl border border-navy-border bg-navy-elevated p-6">
          <h2 className="font-semibold text-slate-100">Rep match</h2>
          <p className="mt-2 font-medium">{repMatch.accountName}</p>
          <p className="text-sm text-slate-400">{repMatch.reseller.name}</p>
          <p className="mt-1 text-sm">Rep: {repMatch.rep.name} · {repMatch.rep.email}</p>
        </section>
      )}
    </div>
  );
}
