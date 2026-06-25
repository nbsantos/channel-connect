"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function NavClient({
  user,
}: {
  user: {
    name: string;
    companyId: string;
    companyType: "vendor" | "reseller";
    isCompanyAdmin: boolean;
  } | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const homePath = user?.companyType === "vendor" ? "/vendor" : "/reseller";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href={user ? homePath : "/"} className="text-xl font-bold text-indigo-700">
          Channel Connect
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href={homePath} className="text-slate-600 hover:text-indigo-700">Home</Link>
              <Link href="/profile" className="text-slate-600 hover:text-indigo-700">Profile</Link>
              <Link href={`/company/${user.companyId}`} className="text-slate-600 hover:text-indigo-700">Company</Link>
              <Link href="/search" className="text-slate-600 hover:text-indigo-700">AI Search</Link>
              <Link href="/notifications" className="text-slate-600 hover:text-indigo-700">Notifications</Link>
              {user.companyType === "vendor" && user.isCompanyAdmin && (
                <Link href="/vendor/billing" className="text-slate-600 hover:text-indigo-700">Billing</Link>
              )}
              <span className="text-slate-400">|</span>
              <span className="text-slate-700">{user.name}</span>
              <button type="button" onClick={handleLogout} className="rounded-md bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-indigo-700">Log in</Link>
              <Link href="/register" className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
