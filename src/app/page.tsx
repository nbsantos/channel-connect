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
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand">Vendor × Reseller Platform</p>
        <p className="text-lg text-slate-700">
          Connect vendors and resellers directly. Register deals, find the right rep, and skip the manual CAM introduction chain.
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-navy-border bg-navy-elevated p-6 text-left shadow-sm shadow-slate-200/80">
          <h2 className="font-semibold text-slate-900">For Resellers</h2>
          <p className="mt-2 text-sm text-slate-700">
            Upload your customer-to-rep mappings. Vendors search one account at a time — your data stays protected. Free to use.
          </p>
        </div>
        <div className="rounded-xl border border-navy-border bg-navy-elevated p-6 text-left shadow-sm shadow-slate-200/80">
          <h2 className="font-semibold text-slate-900">For Vendors</h2>
          <p className="mt-2 text-sm text-slate-700">
            Discover partners, register deal opportunities, and collaborate in-platform. Pay per approved registration.
          </p>
        </div>
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
