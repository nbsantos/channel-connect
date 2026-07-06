"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AccountUploadFormProps {
  companyId: string;
  reps: { id: string; name: string }[];
}

export function AccountUploadForm({ reps }: AccountUploadFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountName: form.get("accountName"),
        industry: form.get("industry"),
        useCase: form.get("useCase"),
        repId: form.get("repId"),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Account added.");
      e.currentTarget.reset();
      router.refresh();
    } else {
      setMessage(data.error || "Upload failed.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Account name</label>
          <input name="accountName" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Assigned rep</label>
          <select name="repId" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2">
            <option value="">Select rep</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Industry</label>
          <input name="industry" className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Use case</label>
          <input name="useCase" placeholder="e.g. cloud security, compliance" className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
        {loading ? "Adding..." : "Add account"}
      </button>
    </form>
  );
}
