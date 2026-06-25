import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ContractForm } from "./contract-form";

export default async function VendorOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.company.type !== "vendor") redirect("/reseller");
  if (!user.isCompanyAdmin) redirect("/vendor");
  if (user.company.contractSignedAt) redirect("/vendor");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendor onboarding</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign the vendor agreement before registering deals on Channel Connect.
        </p>
      </div>
      <Card title="Vendor agreement">
        <ContractForm feeCents={user.company.dealRegistrationFeeCents} defaultEmail={user.email} />
      </Card>
    </div>
  );
}
