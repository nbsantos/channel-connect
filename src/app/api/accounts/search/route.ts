import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchAccountsByQuery } from "@/lib/ai-search";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const resellerId = request.nextUrl.searchParams.get("resellerId") ?? undefined;

  if (!q.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  let results = await searchAccountsByQuery(q);
  if (resellerId) {
    results = results.filter((r) => r.reseller.id === resellerId);
  }

  return NextResponse.json({ results: results.slice(0, 5) });
}
