"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    if (data.hasAdminAccess && data.hasIndividualAccount) {
      setNotice("You have company admin access and an individual Channel Connect account.");
    }

    router.push(data.redirectTo || "/home");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo href="/" height={48} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <p className="mt-2 text-sm text-slate-600">Access your Channel Connect account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-md bg-brand-surface p-3 text-sm text-brand-dark">{notice}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input name="password" type="password" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account? <Link href="/register" className="text-brand hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
