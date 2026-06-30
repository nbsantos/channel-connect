import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailDomain } from "@/lib/domains";

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

  const normalizedEmail = email.toLowerCase().trim();
  const memberDomain = emailDomain(normalizedEmail);
  const allowedDomains = await prisma.companyDomain.findMany({ where: { companyId: id } });
  const allowed = allowedDomains.some((d) => d.domain === memberDomain);

  if (!allowed) {
    return NextResponse.json(
      { error: `Email domain @${memberDomain} is not authorized. Add the domain under company settings first.` },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const member = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name,
      title: title || null,
      isCompanyAdmin: Boolean(isCompanyAdmin),
      companyId: id,
      linkedInVerified: false,
    },
    select: { id: true, name: true, email: true, title: true, isCompanyAdmin: true },
  });

  return NextResponse.json({ member }, { status: 201 });
}
