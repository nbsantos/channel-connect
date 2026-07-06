"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function TeamInviteForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/companies/${companyId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        name: form.get("name"),
        title: form.get("title"),
        password: form.get("password"),
        isCompanyAdmin: form.get("isCompanyAdmin") === "on",
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`Added ${data.member.name}. They can log in with the email and temporary password you set.`);
      e.currentTarget.reset();
      router.refresh();
    } else {
      setError(data.error || "Failed to add team member");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input name="name" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input name="title" className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Temporary password</label>
          <input name="password" type="password" required minLength={6} className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input name="isCompanyAdmin" type="checkbox" />
        Company admin
      </label>
      <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50">
        {loading ? "Adding..." : "Add team member"}
      </button>
    </form>
  );
}
