"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { btnPrimaryLinkClass } from "@/components/ui";
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
  const linkClass = "text-slate-700 hover:text-brand";

  return (
    <header className="border-b border-navy-border bg-navy-elevated/95 backdrop-blur">
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
              <span className="text-slate-800">{user.name}</span>
              <button type="button" onClick={handleLogout} className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-light">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>Log in</Link>
              <Link href="/register" className={btnPrimaryLinkClass}>Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
