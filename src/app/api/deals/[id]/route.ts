import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordBillableDeal } from "@/lib/billing";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();

  if (!["approved", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const deal = await prisma.dealRegistration.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (deal.assigneeId !== user.id) {
    return NextResponse.json({ error: "Only the assignee can approve or decline" }, { status: 403 });
  }

  if (deal.status !== "pending") {
    return NextResponse.json({ error: "Deal already resolved" }, { status: 400 });
  }

  const updated = await prisma.dealRegistration.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });

  if (status === "approved") {
    await recordBillableDeal(id);
  }

  await prisma.notification.create({
    data: {
      userId: deal.initiatorId,
      title: `Deal ${status}`,
      body: `Your deal "${deal.title}" was ${status}.`,
    },
  });

  return NextResponse.json({ deal: updated });
}
