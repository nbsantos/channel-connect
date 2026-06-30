import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    user.company.type === "vendor"
      ? { vendorId: user.companyId }
      : user.company.type === "reseller"
        ? { resellerId: user.companyId }
        : null;

  if (!where) {
    return NextResponse.json({ partnerships: [] });
  }

  const partnerships = await prisma.partnership.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true } },
      reseller: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ partnerships });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.isCompanyAdmin) {
    return NextResponse.json({ error: "Only company admins can manage partnerships" }, { status: 403 });
  }

  const { partnerId } = await request.json();
  if (!partnerId) {
    return NextResponse.json({ error: "partnerId required" }, { status: 400 });
  }

  const partner = await prisma.company.findUnique({ where: { id: partnerId } });
  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  if (user.company.type === "vendor" && partner.type !== "reseller") {
    return NextResponse.json({ error: "Vendors can only partner with resellers" }, { status: 400 });
  }

  if (user.company.type === "reseller" && partner.type !== "vendor") {
    return NextResponse.json({ error: "Resellers can only partner with vendors" }, { status: 400 });
  }

  const vendorId = user.company.type === "vendor" ? user.companyId : partnerId;
  const resellerId = user.company.type === "reseller" ? user.companyId : partnerId;

  const partnership = await prisma.partnership.upsert({
    where: { vendorId_resellerId: { vendorId, resellerId } },
    create: {
      vendorId,
      resellerId,
      status: "pending",
      requestedBy: user.company.type === "vendor" ? "vendor" : "reseller",
    },
    update: {},
    include: {
      vendor: { select: { id: true, name: true } },
      reseller: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ partnership }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.isCompanyAdmin) {
    return NextResponse.json({ error: "Only company admins can approve partnerships" }, { status: 403 });
  }

  const { partnershipId, status } = await request.json();
  if (!partnershipId || !["approved", "declined"].includes(status)) {
    return NextResponse.json({ error: "partnershipId and status (approved|declined) required" }, { status: 400 });
  }

  const partnership = await prisma.partnership.findUnique({ where: { id: partnershipId } });
  if (!partnership) {
    return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
  }

  const isRecipient =
    (user.company.type === "vendor" && partnership.vendorId === user.companyId && partnership.requestedBy === "reseller") ||
    (user.company.type === "reseller" && partnership.resellerId === user.companyId && partnership.requestedBy === "vendor");

  if (!isRecipient) {
    return NextResponse.json({ error: "Only the receiving party can approve or decline" }, { status: 403 });
  }

  const updated = await prisma.partnership.update({
    where: { id: partnershipId },
    data: {
      status,
      signedAt: status === "approved" ? new Date() : null,
    },
    include: {
      vendor: { select: { id: true, name: true } },
      reseller: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ partnership: updated });
}
