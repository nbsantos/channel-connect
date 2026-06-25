import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ResellerAccountSearch } from "./reseller-account-search";

export default async function ResellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.company.type !== "vendor") redirect("/reseller");

  const reseller = await prisma.company.findUnique({ where: { id } });
  if (!reseller || reseller.type !== "reseller") notFound();

  if (!user.company.contractSignedAt && user.isCompanyAdmin) {
    redirect("/vendor/onboarding");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/vendor" className="text-sm text-indigo-600 hover:underline">← Back to vendor home</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{reseller.name}</h1>
        {reseller.description && <p className="mt-1 text-sm text-slate-600">{reseller.description}</p>}
      </div>

      {!user.company.contractSignedAt ? (
        <Card title="Contract required">
          <p className="text-sm text-slate-600">
            Your company admin must sign the vendor agreement before registering deals.
          </p>
        </Card>
      ) : (
        <Card title="Find an account and register opportunity">
          <p className="mb-4 text-sm text-slate-600">
            Search one account at a time to find the mapped rep, then register a deal opportunity.
          </p>
          <ResellerAccountSearch
            resellerId={reseller.id}
            resellerName={reseller.name}
            vendorCompanyId={user.companyId}
            vendorUserId={user.id}
          />
        </Card>
      )}
    </div>
  );
}
