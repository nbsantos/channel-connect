"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CompanyContentForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/companies/${companyId}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        title: form.get("title"),
        url: form.get("url"),
      }),
    });
    setMessage(res.ok ? "Content added." : "Failed to add content.");
    if (res.ok) {
      e.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Type</label>
          <select name="type" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="video">Video</option>
            <option value="whitepaper">White paper</option>
            <option value="brief">Brief</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input name="title" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">URL</label>
          <input name="url" type="url" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
      </div>
      <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        Add content
      </button>
    </form>
  );
}
