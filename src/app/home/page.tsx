import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { homePathForUser } from "@/lib/utils";
import { Card } from "@/components/ui";

export default async function IndividualHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.company.type !== "individual") {
    redirect(homePathForUser(user));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your work domain isn’t linked to a vendor or reseller on Channel Connect yet. You still have access to search and notifications.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="AI search">
          <p className="mb-4 text-sm text-slate-400">Find vendors, resellers, and use-case matches across the platform.</p>
          <Link href="/search" className="text-sm font-medium text-brand-light hover:underline">
            Open AI search →
          </Link>
        </Card>
        <Card title="Your profile">
          <p className="mb-4 text-sm text-slate-400">Update your title, location, and assigned accounts.</p>
          <Link href="/profile" className="text-sm font-medium text-brand-light hover:underline">
            View profile →
          </Link>
        </Card>
      </div>

      <Card title="Join your company">
        <p className="text-sm text-slate-400">
          When your employer registers as a vendor or reseller, anyone with a matching work email domain is connected automatically.
          Ask your company admin to set up Channel Connect or invite you from their company page.
        </p>
      </Card>
    </div>
  );
}
