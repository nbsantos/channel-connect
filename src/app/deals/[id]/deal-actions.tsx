"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DealActions({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve(status: "approved" | "declined") {
    setLoading(true);
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => resolve("approved")}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => resolve("declined")}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
