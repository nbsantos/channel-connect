import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge, StatCard } from "@/components/ui";
import { formatDealStatus } from "@/lib/utils";
import { AccountUploadForm } from "./account-upload-form";
import { DealRegisterForm } from "@/components/deal-register-form";

export default async function ResellerHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.company.type !== "reseller") redirect("/vendor");

  const vendors = await prisma.company.findMany({
    where: { type: "vendor" },
    orderBy: { name: "asc" },
  });

  const accountCount = await prisma.customerAccount.count({
    where: { resellerId: user.companyId },
  });

  const myAccounts = await prisma.customerAccount.count({
    where: { resellerId: user.companyId, repId: user.id },
  });

  const deals = await prisma.dealRegistration.findMany({
    where: {
      OR: [
        { resellerId: user.companyId, assigneeId: user.id },
        { resellerId: user.companyId, initiatorId: user.id },
      ],
    },
    include: {
      vendor: true,
      initiatorUser: true,
      assigneeUser: true,
      account: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reseller Home</h1>
        <p className="mt-1 text-sm text-slate-600">Welcome, {user.name}. Manage accounts and inbound deal registrations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Company accounts" value={accountCount} />
        <StatCard label="Your assigned accounts" value={myAccounts} />
        <StatCard label="Pending deals" value={deals.filter((d) => d.status === "pending" && d.assigneeId === user.id).length} />
      </div>

      {user.isCompanyAdmin && (
        <Card title="Upload customer / rep mapping">
          <p className="mb-4 text-sm text-slate-600">
            Add accounts one at a time. Vendors can only search individual accounts — no bulk export.
          </p>
          <AccountUploadForm companyId={user.companyId} reps={await prisma.user.findMany({
            where: { companyId: user.companyId },
            select: { id: true, name: true },
          })} />
        </Card>
      )}

      <Card title="Register inbound deal to vendor">
        <DealRegisterForm
          mode="reseller"
          companyId={user.companyId}
          userId={user.id}
          partners={vendors.map((v) => ({ id: v.id, name: v.name }))}
        />
      </Card>

      <Card title="Recent deals">
        {deals.length === 0 ? (
          <p className="text-sm text-slate-500">No deals yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {deals.map((deal) => (
              <li key={deal.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/deals/${deal.id}`} className="font-medium text-indigo-600 hover:underline">
                    {deal.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {deal.vendor.name}
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
