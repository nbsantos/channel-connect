import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentType } from "@prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (user.companyId !== id || !user.isCompanyAdmin || user.company.type !== "vendor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, title, url } = await request.json();
  if (!type || !title || !url) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const content = await prisma.companyContent.create({
    data: {
      companyId: id,
      type: type as ContentType,
      title,
      url,
    },
  });

  return NextResponse.json(content, { status: 201 });
}
