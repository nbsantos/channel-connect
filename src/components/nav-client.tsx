"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { CompanyType } from "@prisma/client";

export function NavClient({
  user,
}: {
  user: {
    name: string;
    companyId: string;
    companyType: CompanyType;
    isCompanyAdmin: boolean;
  } | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const homePath =
    user?.companyType === "vendor" ? "/vendor" : user?.companyType === "reseller" ? "/reseller" : "/home";
  const linkClass = "text-slate-300 hover:text-brand-light";

  return (
    <header className="border-b border-navy-border bg-brand-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo href={user ? homePath : "/"} height={32} priority />
        <nav className="flex flex-wrap items-center justify-end gap-4 text-sm">
          {user ? (
            <>
              <Link href={homePath} className={linkClass}>Home</Link>
              <Link href="/profile" className={linkClass}>Profile</Link>
              <Link href={`/company/${user.companyId}`} className={linkClass}>Company</Link>
              {user.companyType !== "individual" && (
                <Link href="/search" className={linkClass}>AI Search</Link>
              )}
              {user.companyType === "individual" && (
                <Link href="/search" className={linkClass}>Search</Link>
              )}
              <Link href="/notifications" className={linkClass}>Notifications</Link>
              {user.companyType === "vendor" && user.isCompanyAdmin && (
                <Link href="/vendor/billing" className={linkClass}>Billing</Link>
              )}
              <span className="hidden text-slate-500 sm:inline">|</span>
              <span className="text-slate-200">{user.name}</span>
              <button type="button" onClick={handleLogout} className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-light">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>Log in</Link>
              <Link href="/register" className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-light">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
