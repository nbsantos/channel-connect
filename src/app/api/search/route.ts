import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchAccountsByQuery, searchVendorsByUseCase, matchRepForAccount } from "@/lib/ai-search";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "accounts";

  if (!q.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  if (type === "vendors") {
    const vendors = await searchVendorsByUseCase(q);
    return NextResponse.json({ vendors: vendors.slice(0, 10) });
  }

  if (type === "rep") {
    const resellerId = request.nextUrl.searchParams.get("resellerId") ?? undefined;
    const match = await matchRepForAccount(q, resellerId);
    return NextResponse.json({ match });
  }

  const accounts = await searchAccountsByQuery(q);
  return NextResponse.json({ accounts: accounts.slice(0, 10) });
}
