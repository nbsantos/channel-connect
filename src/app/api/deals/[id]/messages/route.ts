import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await request.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }

  const deal = await prisma.dealRegistration.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant = deal.initiatorId === user.id || deal.assigneeId === user.id;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const recipientId = deal.initiatorId === user.id ? deal.assigneeId : deal.initiatorId;

  const message = await prisma.message.create({
    data: {
      dealId: id,
      senderId: user.id,
      recipientId,
      body: body.trim(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: recipientId,
      title: "New message on deal",
      body: `${user.name} sent a message on "${deal.title}".`,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
