import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { formatCents } from "@/lib/billing";

export default async function VendorBillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.company.type !== "vendor") redirect("/reseller");
  if (!user.isCompanyAdmin) redirect("/vendor");

  const invoices = await prisma.invoice.findMany({
    where: { vendorId: user.companyId },
    include: {
      lineItems: {
        include: {
          deal: { include: { reseller: true, account: true } },
        },
      },
    },
    orderBy: { periodStart: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatCents(user.company.dealRegistrationFeeCents)} per approved vendor-initiated registration · invoiced monthly
        </p>
      </div>

      {!user.company.contractSignedAt ? (
        <Card title="Contract required">
          <p className="text-sm text-slate-600">
            <Link href="/vendor/onboarding" className="text-indigo-600 hover:underline">Sign the vendor agreement</Link> to register deals.
          </p>
        </Card>
      ) : (
        <Card title="Contract">
          <p className="text-sm text-slate-600">
            Signed {user.company.contractSignedAt.toLocaleDateString()}
            {user.company.billingEmail ? ` · Billing: ${user.company.billingEmail}` : ""}
          </p>
        </Card>
      )}

      <Card title="Invoices">
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No billable registrations yet.</p>
        ) : (
          <ul className="space-y-6">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {invoice.periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                    <p className="text-sm text-slate-500">{invoice.lineItems.length} approved registration(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCents(invoice.totalCents)}</p>
                    <Badge variant={invoice.status === "paid" ? "success" : invoice.status === "sent" ? "warning" : "default"}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
                {invoice.lineItems.length > 0 && (
                  <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3">
                    {invoice.lineItems.map((item) => (
                      <li key={item.id} className="flex justify-between py-2 text-sm">
                        <span>
                          <Link href={`/deals/${item.dealId}`} className="text-indigo-600 hover:underline">
                            {item.deal.title}
                          </Link>
                          <span className="text-slate-500"> · {item.deal.reseller.name}</span>
                        </span>
                        <span>{formatCents(item.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
