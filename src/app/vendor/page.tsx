import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge, StatCard } from "@/components/ui";
import { formatDealStatus } from "@/lib/utils";
import { VendorSearch } from "./vendor-search";
import { DealRegisterForm } from "@/components/deal-register-form";

export default async function VendorHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.company.type !== "vendor") redirect(user.company.type === "individual" ? "/home" : "/reseller");
  if (user.isCompanyAdmin && (!user.company.annualFeePaidAt || !user.company.contractSignedAt)) {
    redirect("/vendor/onboarding");
  }

  const allResellers = await prisma.company.findMany({
    where: { type: "reseller" },
    orderBy: { name: "asc" },
  });

  const partnerships = await prisma.partnership.findMany({
    where: { vendorId: user.companyId },
  });
  const partnerMap = new Map(partnerships.map((p) => [p.resellerId, p]));

  const partnered = allResellers.filter((r) => partnerMap.get(r.id)?.status === "approved");
  const others = allResellers.filter((r) => partnerMap.get(r.id)?.status !== "approved");
  const resellers = [...partnered, ...others];

  const pendingDeals = await prisma.dealRegistration.findMany({
    where: {
      OR: [
        { vendorId: user.companyId, assigneeId: user.id, status: "pending" },
        { vendorId: user.companyId, initiatorId: user.id },
      ],
    },
    include: {
      reseller: true,
      initiatorUser: true,
      assigneeUser: true,
      account: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const approvedCount = await prisma.dealRegistration.count({
    where: { vendorId: user.companyId, status: "approved", initiator: "vendor" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Home</h1>
          <p className="mt-1 text-sm text-slate-600">Welcome, {user.name}. Find resellers and register deal opportunities.</p>
        </div>
        {user.isCompanyAdmin && (
          <Link href="/vendor/billing" className="text-sm text-brand hover:underline">
            Billing
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Approved deals (outbound)" value={approvedCount} />
        <StatCard label="Pending actions" value={pendingDeals.filter((d) => d.status === "pending" && d.assigneeId === user.id).length} />
        <StatCard label="Partner resellers" value={resellers.length} />
      </div>

      <Card title="Partner resellers">
        <p className="mb-3 text-sm text-slate-500">Signed partners appear first; other resellers are listed as unsigned.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {resellers.map((reseller) => {
            const partnership = partnerMap.get(reseller.id);
            const isPartner = partnership?.status === "approved";
            return (
              <li key={reseller.id}>
                <Link
                  href={`/resellers/${reseller.id}`}
                  className="flex items-center justify-between rounded-lg border border-navy-border px-4 py-3 text-sm font-medium text-slate-900 hover:border-brand hover:bg-brand-surface"
                >
                  <span>{reseller.name}</span>
                  <Badge variant={isPartner ? "success" : "warning"}>{isPartner ? "Partner" : "Unsigned"}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Find a reseller rep by account">
        <p className="mb-4 text-sm text-slate-600">
          Search one account at a time. Reseller customer lists are never exposed in bulk.
        </p>
        <VendorSearch resellers={resellers.map((r) => ({ id: r.id, name: r.name }))} />
      </Card>

      <Card title="Register deal to reseller">
        <DealRegisterForm
          mode="vendor"
          companyId={user.companyId}
          userId={user.id}
          partners={resellers.map((r) => ({ id: r.id, name: r.name }))}
        />
      </Card>

      <Card title="Recent deals">
        {pendingDeals.length === 0 ? (
          <p className="text-sm text-slate-500">No deals yet.</p>
        ) : (
          <ul className="divide-y divide-navy-border">
            {pendingDeals.map((deal) => (
              <li key={deal.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/deals/${deal.id}`} className="font-medium text-brand hover:underline">
                    {deal.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {deal.reseller.name}
                    {deal.account ? ` · ${deal.account.accountName}` : ""}
                  </p>
                </div>
                <Badge variant={deal.status === "approved" ? "success" : deal.status === "declined" ? "danger" : "warning"}>
                  {formatDealStatus(deal.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
