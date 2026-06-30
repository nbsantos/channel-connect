import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkWatchedAccountChatter } from "@/lib/ai-search";
import { Card } from "@/components/ui";
import { NotificationActions } from "./notification-actions";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await checkWatchedAccountChatter(user.id);

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Notifications</h1>
        <p className="mt-1 text-sm text-slate-400">Deal updates, messages, and accounts-to-watch activity.</p>
      </div>

      <Card title="Recent">
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {notifications.map((n) => (
              <li key={n.id} className={`flex items-start justify-between gap-4 py-3 ${n.read ? "opacity-60" : ""}`}>
                <div>
                  <p className="font-medium text-slate-100">{n.title}</p>
                  <p className="text-sm text-slate-400">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{n.createdAt.toLocaleString()}</p>
                </div>
                {!n.read && <NotificationActions id={n.id} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
