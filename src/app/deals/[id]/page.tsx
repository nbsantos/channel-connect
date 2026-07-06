import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { formatDealStatus } from "@/lib/utils";
import { DealActions } from "./deal-actions";
import { MessageForm } from "./message-form";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const deal = await prisma.dealRegistration.findUnique({
    where: { id },
    include: {
      vendor: true,
      reseller: true,
      account: true,
      initiatorUser: true,
      assigneeUser: true,
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!deal) notFound();

  const isParticipant = deal.initiatorId === user.id || deal.assigneeId === user.id;
  if (!isParticipant) redirect("/");

  const canResolve = deal.assigneeId === user.id && deal.status === "pending";

  return (
    <div className="space-y-6">
      <div>
        <Badge variant={deal.status === "approved" ? "success" : deal.status === "declined" ? "danger" : "warning"}>
          {formatDealStatus(deal.status)}
        </Badge>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{deal.title}</h1>
        <p className="mt-2 text-slate-600">{deal.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Parties">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Vendor</dt><dd className="font-medium">{deal.vendor.name}</dd></div>
            <div><dt className="text-slate-500">Reseller</dt><dd className="font-medium">{deal.reseller.name}</dd></div>
            <div><dt className="text-slate-500">Initiated by</dt><dd className="font-medium">{deal.initiatorUser.name} ({deal.initiator})</dd></div>
            <div><dt className="text-slate-500">Assignee</dt><dd className="font-medium">{deal.assigneeUser.name}</dd></div>
            {deal.account && (
              <div><dt className="text-slate-500">Account</dt><dd className="font-medium">{deal.account.accountName}</dd></div>
            )}
          </dl>
        </Card>

        {canResolve && (
          <Card title="Your action">
            <DealActions dealId={deal.id} />
          </Card>
        )}
      </div>

      <Card title="Messages">
        {deal.messages.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">No messages yet.</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {deal.messages.map((m) => (
              <li key={m.id} className={`rounded-lg p-3 text-sm ${m.senderId === user.id ? "bg-brand-surface" : "bg-navy-elevated"}`}>
                <p className="font-medium text-slate-900">{m.sender.name}</p>
                <p className="mt-1 text-slate-700">{m.body}</p>
                <p className="mt-1 text-xs text-slate-600">{m.createdAt.toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
        <MessageForm dealId={deal.id} />
      </Card>
    </div>
  );
}
