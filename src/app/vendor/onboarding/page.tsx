import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ContractForm } from "./contract-form";
import { AnnualFeeForm } from "./annual-fee-form";

export default async function VendorOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.company.type !== "vendor") redirect(user.company.type === "individual" ? "/home" : "/reseller");
  if (!user.isCompanyAdmin) redirect("/vendor");
  if (user.company.annualFeePaidAt && user.company.contractSignedAt) redirect("/vendor");

  const needsAnnualFee = !user.company.annualFeePaidAt;
  const needsContract = !user.company.contractSignedAt;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Vendor onboarding</h1>
        <p className="mt-1 text-sm text-slate-400">
          Complete membership payment and sign the deal registration agreement before registering deals.
        </p>
      </div>

      {needsAnnualFee && (
        <Card title="Step 1 — Annual vendor membership">
          <AnnualFeeForm defaultEmail={user.email} />
        </Card>
      )}

      {!needsAnnualFee && needsContract && (
        <Card title="Step 2 — Deal registration agreement">
          <ContractForm feeCents={user.company.dealRegistrationFeeCents} defaultEmail={user.email} />
        </Card>
      )}
    </div>
  );
}
