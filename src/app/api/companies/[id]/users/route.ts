import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.companyId !== id || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, name, title, password, isCompanyAdmin } = await request.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Email, name, and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const member = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      title: title || null,
      isCompanyAdmin: Boolean(isCompanyAdmin),
      companyId: id,
    },
    select: { id: true, name: true, email: true, title: true, isCompanyAdmin: true },
  });

  return NextResponse.json({ member }, { status: 201 });
}
