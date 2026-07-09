import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForUser } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { btnPrimaryLinkClass } from "@/components/ui";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathForUser(user));

  return (
    <div className="flex flex-col items-center gap-12 py-12 text-center">
      <Logo href="/" height={72} priority className="max-w-[min(100%,320px)]" />

      <div className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">Vendors + Resellers</p>
        <p className="text-lg text-slate-700">
          Find the right Reseller, Vendor, Account Rep, Opportunity!
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/register" className={`${btnPrimaryLinkClass} px-6 py-3`}>
          Get started
        </Link>
        <Link href="/login" className="rounded-lg border border-navy-border bg-white px-6 py-3 font-medium text-slate-800 hover:border-brand hover:bg-brand-surface">
          Log in
        </Link>
      </div>
    </div>
  );
}
