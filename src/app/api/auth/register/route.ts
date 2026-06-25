import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { CompanyType } from "@prisma/client";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, name, title, location, companyName, companyType } = body;

  if (!email || !password || !name || !companyName || !companyType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["vendor", "reseller"].includes(companyType)) {
    return NextResponse.json({ error: "Invalid company type" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      title: title || null,
      location: location || null,
      isCompanyAdmin: true,
      company: {
        create: {
          name: companyName,
          type: companyType as CompanyType,
        },
      },
    },
    include: { company: true },
  });

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      companyType: user.company.type,
    },
  }, { status: 201 });
}
