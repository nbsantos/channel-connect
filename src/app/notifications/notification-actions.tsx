"use client";

import { useRouter } from "next/navigation";

export function NotificationActions({ id }: { id: string }) {
  const router = useRouter();

  async function markRead() {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    router.refresh();
  }

  return (
    <button type="button" onClick={markRead} className="shrink-0 text-xs text-brand-light hover:underline">
      Mark read
    </button>
  );
}
