import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.companyId !== id || !user.isCompanyAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, website } = await request.json();

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: name ?? undefined,
      description: description || null,
      website: website || null,
    },
  });

  return NextResponse.json(company);
}
