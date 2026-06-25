import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.company.type !== "reseller" || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Only reseller admins can upload accounts" }, { status: 403 });
  }

  const { accountName, industry, useCase, repId } = await request.json();

  if (!accountName || !repId) {
    return NextResponse.json({ error: "Account name and rep required" }, { status: 400 });
  }

  const rep = await prisma.user.findFirst({
    where: { id: repId, companyId: user.companyId },
  });
  if (!rep) return NextResponse.json({ error: "Invalid rep" }, { status: 400 });

  const account = await prisma.customerAccount.create({
    data: {
      accountName,
      industry: industry || null,
      useCase: useCase || null,
      resellerId: user.companyId,
      repId,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
