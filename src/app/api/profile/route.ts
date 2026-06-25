import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, title, location } = await request.json();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name ?? user.name,
      title: title || null,
      location: location || null,
    },
  });

  return NextResponse.json({ ok: true });
}
