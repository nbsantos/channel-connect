import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathForCompanyType } from "@/lib/utils";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathForCompanyType(user.company.type));

  return (
    <div className="flex flex-col items-center gap-12 py-16 text-center">
      <div className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-600">Vendor × Reseller Platform</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Channel Connect</h1>
        <p className="mt-6 text-lg text-slate-600">
          Connect vendors and resellers directly. Register deals, find the right rep, and skip the manual CAM introduction chain.
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="font-semibold text-slate-900">For Resellers</h2>
          <p className="mt-2 text-sm text-slate-600">
            Upload your customer-to-rep mappings. Vendors search one account at a time — your data stays protected. Free to use.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <h2 className="font-semibold text-slate-900">For Vendors</h2>
          <p className="mt-2 text-sm text-slate-600">
            Discover partners, register deal opportunities, and collaborate in-platform. Pay per approved registration.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/register" className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">
          Get started
        </Link>
        <Link href="/login" className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50">
          Log in
        </Link>
      </div>
    </div>
  );
}
