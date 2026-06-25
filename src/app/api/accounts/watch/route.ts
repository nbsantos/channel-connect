import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId } = await request.json();
  if (!accountId) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

  const account = await prisma.customerAccount.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const watch = await prisma.watchedAccount.upsert({
    where: { userId_accountId: { userId: user.id, accountId } },
    create: { userId: user.id, accountId },
    update: {},
  });

  return NextResponse.json({ watch }, { status: 201 });
}
