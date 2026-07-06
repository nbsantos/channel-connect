import { prisma } from "./prisma";
import { CompanyType } from "@prisma/client";

export interface SearchResult {
  accountId: string;
  accountName: string;
  industry: string | null;
  useCase: string | null;
  reseller: { id: string; name: string };
  rep: { id: string; name: string; title: string | null; email: string };
  matchScore: number;
  matchReason: string;
}

export async function searchAccountsByQuery(query: string, limit = 10): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const accounts = await prisma.customerAccount.findMany({
    include: {
      reseller: true,
      rep: true,
    },
  });

  const scored = accounts
    .map((account) => {
      const fields = [
        account.accountName,
        account.industry ?? "",
        account.useCase ?? "",
        account.reseller.name,
        account.rep.name,
      ];
      const haystack = fields.join(" ").toLowerCase();

      let score = 0;
      const reasons: string[] = [];

      if (account.accountName.toLowerCase().includes(q)) {
        score += 10;
        reasons.push("account name match");
      }
      if (account.useCase?.toLowerCase().includes(q)) {
        score += 8;
        reasons.push("use case match");
      }
      if (account.industry?.toLowerCase().includes(q)) {
        score += 5;
        reasons.push("industry match");
      }
      if (account.reseller.name.toLowerCase().includes(q)) {
        score += 3;
        reasons.push("reseller match");
      }

      const tokens = q.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        if (token.length > 2 && haystack.includes(token)) {
          score += 2;
        }
      }

      return {
        accountId: account.id,
        accountName: account.accountName,
        industry: account.industry,
        useCase: account.useCase,
        reseller: { id: account.reseller.id, name: account.reseller.name },
        rep: {
          id: account.rep.id,
          name: account.rep.name,
          title: account.rep.title,
          email: account.rep.email,
        },
        matchScore: score,
        matchReason: reasons.length ? reasons.join(", ") : "keyword overlap",
      };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
}

export async function searchVendorsByUseCase(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const vendors = await prisma.company.findMany({
    where: { type: CompanyType.vendor },
    include: {
      useCases: true,
      content: true,
      users: { take: 1 },
    },
  });

  return vendors
    .map((vendor) => {
      const tags = vendor.useCases.map((t) => t.tag.toLowerCase());
      const desc = (vendor.description ?? "").toLowerCase();
      const name = vendor.name.toLowerCase();

      let score = 0;
      if (name.includes(q)) score += 5;
      if (desc.includes(q)) score += 4;
      for (const tag of tags) {
        if (tag.includes(q)) score += 8;
      }

      return {
        vendor: {
          id: vendor.id,
          name: vendor.name,
          description: vendor.description,
          useCases: vendor.useCases.map((t) => t.tag),
          contentCount: vendor.content.length,
        },
        contact: vendor.users[0]
          ? { id: vendor.users[0].id, name: vendor.users[0].name, email: vendor.users[0].email }
          : null,
        matchScore: score,
      };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function matchRepForAccount(accountName: string, resellerId?: string) {
  const where: {
    accountName: { contains: string; mode: "insensitive" };
    resellerId?: string;
  } = {
    accountName: { contains: accountName, mode: "insensitive" },
  };
  if (resellerId) where.resellerId = resellerId;

  const account = await prisma.customerAccount.findFirst({
    where,
    include: { rep: true, reseller: true },
  });

  if (!account) return null;

  return {
    accountId: account.id,
    accountName: account.accountName,
    rep: account.rep,
    reseller: account.reseller,
  };
}

export async function checkWatchedAccountChatter(userId: string) {
  const watched = await prisma.watchedAccount.findMany({
    where: { userId },
    include: { account: true },
  });

  const notifications = [];

  for (const watch of watched) {
    const recentDeals = await prisma.dealRegistration.count({
      where: {
        accountId: watch.accountId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentDeals > 0) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title: { contains: watch.account.accountName, mode: "insensitive" },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        const notification = await prisma.notification.create({
          data: {
            userId,
            title: `Activity on ${watch.account.accountName}`,
            body: `${recentDeals} deal registration(s) in the last 7 days for an account you're watching.`,
          },
        });
        notifications.push(notification);
      }
    }
  }

  return notifications;
}
