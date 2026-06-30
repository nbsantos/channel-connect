import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { payVendorAnnualFee, VENDOR_ANNUAL_FEE_CENTS } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.company.type !== "vendor" || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Only vendor admins can pay the annual fee" }, { status: 403 });
  }

  if (user.company.annualFeePaidAt) {
    return NextResponse.json({ error: "Annual fee already paid" }, { status: 400 });
  }

  const { billingEmail, accepted } = await request.json();
  if (!accepted) {
    return NextResponse.json({ error: "Payment authorization required" }, { status: 400 });
  }

  const company = await payVendorAnnualFee(user.companyId, billingEmail || user.email);

  return NextResponse.json({ company, annualFeeCents: VENDOR_ANNUAL_FEE_CENTS });
}
