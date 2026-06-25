"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        name: form.get("name"),
        title: form.get("title"),
        location: form.get("location"),
        companyName: form.get("companyName"),
        companyType: form.get("companyType"),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    router.push(data.user.companyType === "vendor" ? "/vendor" : "/reseller");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
      <p className="mt-2 text-sm text-slate-600">Join Channel Connect as a vendor or reseller.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700">Full name</label>
          <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input name="password" type="password" required minLength={6} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input name="title" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Location</label>
          <input name="location" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Company name</label>
          <input name="companyName" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Company type</label>
          <select name="companyType" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            <option value="">Select type</option>
            <option value="vendor">Vendor</option>
            <option value="reseller">Reseller</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="text-indigo-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
