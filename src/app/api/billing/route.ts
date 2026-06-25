import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signVendorContract } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.company.type !== "vendor" || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Only vendor admins can sign the contract" }, { status: 403 });
  }

  if (user.company.contractSignedAt) {
    return NextResponse.json({ error: "Contract already signed" }, { status: 400 });
  }

  const { billingEmail, accepted } = await request.json();
  if (!accepted) {
    return NextResponse.json({ error: "Contract acceptance required" }, { status: 400 });
  }

  const company = await signVendorContract(user.companyId, billingEmail || user.email);

  return NextResponse.json({ company });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.company.type !== "vendor" || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  return NextResponse.json({
    contractSignedAt: user.company.contractSignedAt,
    dealRegistrationFeeCents: user.company.dealRegistrationFeeCents,
    billingEmail: user.company.billingEmail,
    invoices,
  });
}
