import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DealInitiator } from "@prisma/client";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, partnerId, accountId, assigneeId, initiator } = await request.json();

  if (!title || !description || !partnerId || !initiator) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let vendorId: string;
  let resellerId: string;
  let resolvedAssigneeId = assigneeId as string | undefined;
  const resolvedAccountId = accountId as string | undefined;

  if (initiator === "vendor") {
    if (user.company.type !== "vendor") {
      return NextResponse.json({ error: "Only vendors can initiate vendor deals" }, { status: 403 });
    }
    if (!user.company.contractSignedAt) {
      return NextResponse.json({ error: "Sign the vendor agreement before registering deals" }, { status: 403 });
    }
    vendorId = user.companyId;
    resellerId = partnerId;

    if (resolvedAccountId) {
      const account = await prisma.customerAccount.findUnique({
        where: { id: resolvedAccountId },
        include: { rep: true },
      });
      if (!account || account.resellerId !== resellerId) {
        return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      }
      resolvedAssigneeId = account.repId;
    } else if (!resolvedAssigneeId) {
      const partnerReps = await prisma.user.findMany({ where: { companyId: resellerId }, take: 1 });
      if (!partnerReps[0]) {
        return NextResponse.json({ error: "No reseller rep found" }, { status: 400 });
      }
      resolvedAssigneeId = partnerReps[0].id;
    }
  } else {
    if (user.company.type !== "reseller") {
      return NextResponse.json({ error: "Only resellers can initiate reseller deals" }, { status: 403 });
    }
    resellerId = user.companyId;
    vendorId = partnerId;

    if (!resolvedAssigneeId) {
      const vendorReps = await prisma.user.findMany({ where: { companyId: vendorId }, take: 1 });
      if (!vendorReps[0]) {
        return NextResponse.json({ error: "No vendor contact found" }, { status: 400 });
      }
      resolvedAssigneeId = vendorReps[0].id;
    }
  }

  const deal = await prisma.dealRegistration.create({
    data: {
      title,
      description,
      initiator: initiator as DealInitiator,
      vendorId,
      resellerId,
      accountId: resolvedAccountId,
      initiatorId: user.id,
      assigneeId: resolvedAssigneeId!,
    },
  });

  await prisma.notification.create({
    data: {
      userId: resolvedAssigneeId!,
      title: "New deal registration",
      body: `${user.name} registered "${title}" for your review.`,
    },
  });

  return NextResponse.json({ deal }, { status: 201 });
}
