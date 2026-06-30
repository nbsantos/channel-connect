"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

type JoinMode = "vendor_admin" | "reseller_admin" | "individual";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinMode, setJoinMode] = useState<JoinMode>("individual");

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
        linkedInUrl: form.get("linkedInUrl"),
        joinMode,
        inSecuritySpace: form.get("inSecuritySpace") === "on",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    router.push(data.redirectTo || "/home");
    router.refresh();
  }

  const isAdmin = joinMode === "vendor_admin" || joinMode === "reseller_admin";

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex justify-center">
        <Logo href="/" height={48} />
      </div>
      <h1 className="text-2xl font-bold text-white">Join Channel Connect</h1>
      <p className="mt-2 text-sm text-slate-400">Choose how you want to join. Work email and LinkedIn verification are required.</p>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {(
          [
            ["individual", "Individual user", "Search & connect via your work domain"],
            ["reseller_admin", "Reseller admin", "Set up your reseller company (free)"],
            ["vendor_admin", "Vendor admin", "Security vendors — $5k/year + per-deal fees"],
          ] as const
        ).map(([mode, label, hint]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setJoinMode(mode)}
            className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
              joinMode === mode
                ? "border-brand bg-brand-surface text-white"
                : "border-navy-border text-slate-400 hover:border-slate-600"
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className="mt-1 block text-xs opacity-80">{hint}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-md bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-300">Full name</label>
          <input name="name" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">Work email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? "Your email domain becomes your company’s primary domain. Teammates with the same domain can join for free."
              : "You’ll be linked to your employer’s company page when the domain is registered on Channel Connect."}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">LinkedIn profile URL</label>
          <input
            name="linkedInUrl"
            type="url"
            required
            placeholder="https://www.linkedin.com/in/your-name"
            className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300">Password</label>
          <input name="password" type="password" required minLength={6} className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300">Title</label>
            <input name="title" className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Location</label>
            <input name="location" className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
          </div>
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-slate-300">Company name</label>
            <input name="companyName" required={isAdmin} className="mt-1 w-full rounded-lg border border-navy-border px-3 py-2" />
          </div>
        )}

        {joinMode === "vendor_admin" && (
          <>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input name="inSecuritySpace" type="checkbox" required className="mt-1" />
              <span>Our company operates in the security space and is listed on LinkedIn.</span>
            </label>
            <p className="text-xs text-slate-500">
              After signup you’ll pay the $5,000 annual vendor fee, then sign the $500/deal registration agreement.
            </p>
          </>
        )}

        {joinMode === "reseller_admin" && (
          <p className="text-xs text-slate-500">Reseller accounts are free. Your company must be verifiable on LinkedIn.</p>
        )}

        <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account? <Link href="/login" className="text-brand-light hover:underline">Log in</Link>
      </p>
    </div>
  );
}
