import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const watched = await prisma.watchedAccount.findMany({
    where: { userId: user.id },
    include: { account: { include: { reseller: true } } },
  });

  const assignedAccounts = await prisma.customerAccount.findMany({
    where: { repId: user.id },
    include: { reseller: true },
    orderBy: { accountName: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Individual Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Your personal Channel Connect profile.</p>
      </div>

      <Card title="Profile details">
        <ProfileForm
          user={{
            name: user.name,
            title: user.title ?? "",
            location: user.location ?? "",
            email: user.email,
            companyName: user.company.name,
            companyType: user.company.type,
          }}
        />
      </Card>

      {assignedAccounts.length > 0 && (
        <Card title="Assigned accounts">
          <ul className="divide-y divide-slate-800">
            {assignedAccounts.map((account) => (
              <li key={account.id} className="py-3">
                <p className="font-medium text-slate-100">{account.accountName}</p>
                <p className="text-sm text-slate-500">{account.reseller.name}</p>
                {account.useCase && <p className="text-xs text-slate-500">{account.useCase}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Accounts to watch">
        {watched.length === 0 ? (
          <p className="text-sm text-slate-500">No watched accounts yet. Watch accounts from search results or deal pages.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {watched.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-100">{w.account.accountName}</p>
                  <p className="text-sm text-slate-500">{w.account.reseller.name}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
