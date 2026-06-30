import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { CompanyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { emailDomain, isLinkedInProfileUrl, isWorkEmail } from "@/lib/domains";
import { homePathForUser } from "@/lib/utils";

type JoinMode = "vendor_admin" | "reseller_admin" | "individual";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    email,
    password,
    name,
    title,
    location,
    companyName,
    joinMode,
    linkedInUrl,
    inSecuritySpace,
  } = body;

  const mode = joinMode as JoinMode;

  if (!email || !password || !name || !mode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["vendor_admin", "reseller_admin", "individual"].includes(mode)) {
    return NextResponse.json({ error: "Invalid join mode" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const domain = emailDomain(normalizedEmail);

  if (!domain) {
    return NextResponse.json({ error: "Valid work email required" }, { status: 400 });
  }

  if (!isWorkEmail(normalizedEmail)) {
    return NextResponse.json({ error: "Please register with your work email, not a personal address" }, { status: 400 });
  }

  if (!linkedInUrl || !isLinkedInProfileUrl(linkedInUrl)) {
    return NextResponse.json({ error: "A valid LinkedIn profile URL is required (linkedin.com/in/...)" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const domainRecord = await prisma.companyDomain.findUnique({
    where: { domain },
    include: { company: true },
  });

  if (mode === "individual") {
    if (domainRecord) {
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          title: title || null,
          location: location || null,
          linkedInUrl,
          linkedInVerified: true,
          isCompanyAdmin: false,
          companyId: domainRecord.companyId,
        },
        include: { company: true },
      });

      await createSession(user.id);
      return NextResponse.json(
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            companyType: user.company.type,
            isCompanyAdmin: user.isCompanyAdmin,
            joinedExistingCompany: true,
          },
          redirectTo: homePathForUser(user),
        },
        { status: 201 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        title: title || null,
        location: location || null,
        linkedInUrl,
        linkedInVerified: true,
        isCompanyAdmin: true,
        company: {
          create: {
            name: `${name}'s workspace`,
            type: CompanyType.individual,
            linkedInUrl,
            linkedInVerified: true,
            domains: { create: { domain } },
          },
        },
      },
      include: { company: true },
    });

    await createSession(user.id);
    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          companyType: user.company.type,
          isCompanyAdmin: user.isCompanyAdmin,
          joinedExistingCompany: false,
        },
        redirectTo: homePathForUser(user),
      },
      { status: 201 },
    );
  }

  if (domainRecord) {
    const expectedType = mode === "vendor_admin" ? CompanyType.vendor : CompanyType.reseller;
    if (domainRecord.company.type !== expectedType) {
      return NextResponse.json(
        { error: `This email domain is already registered as a ${domainRecord.company.type}. Contact your company admin to be added.` },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "A company already exists for this domain. Ask your admin to add you, or sign up as an individual user." },
      { status: 409 },
    );
  }

  if (!companyName?.trim()) {
    return NextResponse.json({ error: "Company name required" }, { status: 400 });
  }

  if (mode === "vendor_admin") {
    if (!inSecuritySpace) {
      return NextResponse.json({ error: "Vendors must operate in the security space" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        title: title || null,
        location: location || null,
        linkedInUrl,
        linkedInVerified: true,
        isCompanyAdmin: true,
        company: {
          create: {
            name: companyName.trim(),
            type: CompanyType.vendor,
            linkedInUrl,
            linkedInVerified: true,
            inSecuritySpace: true,
            domains: { create: { domain } },
          },
        },
      },
      include: { company: true },
    });

    await createSession(user.id);
    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          companyType: user.company.type,
          isCompanyAdmin: user.isCompanyAdmin,
        },
        redirectTo: homePathForUser(user),
      },
      { status: 201 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name,
      title: title || null,
      location: location || null,
      linkedInUrl,
      linkedInVerified: true,
      isCompanyAdmin: true,
      company: {
        create: {
          name: companyName.trim(),
          type: CompanyType.reseller,
          linkedInUrl,
          linkedInVerified: true,
          domains: { create: { domain } },
        },
      },
    },
    include: { company: true },
  });

  await createSession(user.id);
  return NextResponse.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyType: user.company.type,
        isCompanyAdmin: user.isCompanyAdmin,
      },
      redirectTo: homePathForUser(user),
    },
    { status: 201 },
  );
}
