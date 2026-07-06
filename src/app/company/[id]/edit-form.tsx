"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CompanyEditForm({ company }: { company: { id: string; name: string; description: string; website: string } }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        website: form.get("website"),
      }),
    });
    setMessage(res.ok ? "Company updated." : "Update failed.");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div>
        <label className="block text-sm font-medium text-slate-700">Company name</label>
        <input name="name" defaultValue={company.name} required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea name="description" defaultValue={company.description} rows={3} className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Website</label>
        <input name="website" defaultValue={company.website} className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
      </div>
      <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light">
        Save company
      </button>
    </form>
  );
}
