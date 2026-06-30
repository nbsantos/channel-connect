import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailDomain } from "@/lib/domains";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.companyId !== id || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const domains = await prisma.companyDomain.findMany({
    where: { companyId: id },
    orderBy: { domain: "asc" },
  });

  return NextResponse.json({ domains });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.companyId !== id || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { domain } = await request.json();
  const normalized = String(domain || "").toLowerCase().trim();

  if (!normalized || normalized.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email domain (e.g. example.com)" }, { status: 400 });
  }

  const existing = await prisma.companyDomain.findUnique({ where: { domain: normalized } });
  if (existing && existing.companyId !== id) {
    return NextResponse.json({ error: "Domain is already registered to another company" }, { status: 409 });
  }

  if (existing) {
    return NextResponse.json({ domain: existing });
  }

  const created = await prisma.companyDomain.create({
    data: { companyId: id, domain: normalized },
  });

  return NextResponse.json({ domain: created }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.companyId !== id || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const domainId = request.nextUrl.searchParams.get("domainId");
  if (!domainId) {
    return NextResponse.json({ error: "domainId required" }, { status: 400 });
  }

  const record = await prisma.companyDomain.findUnique({ where: { id: domainId } });
  if (!record || record.companyId !== id) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const count = await prisma.companyDomain.count({ where: { companyId: id } });
  if (count <= 1) {
    return NextResponse.json({ error: "At least one email domain is required" }, { status: 400 });
  }

  const adminDomain = emailDomain(user.email);
  if (record.domain === adminDomain) {
    return NextResponse.json({ error: "Cannot remove your own email domain" }, { status: 400 });
  }

  await prisma.companyDomain.delete({ where: { id: domainId } });
  return NextResponse.json({ ok: true });
}
