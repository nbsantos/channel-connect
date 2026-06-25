"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  user: {
    name: string;
    title: string;
    location: string;
    email: string;
    companyName: string;
    companyType: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        title: form.get("title"),
        location: form.get("location"),
      }),
    });

    if (res.ok) {
      setMessage("Profile updated.");
      router.refresh();
    } else {
      setMessage("Failed to update profile.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && <p className="text-sm text-green-700">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Name</label>
          <input name="name" defaultValue={user.name} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input name="title" defaultValue={user.title} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Location</label>
          <input name="location" defaultValue={user.location} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input value={user.email} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
        </div>
      </div>
      <div className="rounded-lg bg-slate-50 p-4 text-sm">
        <p><span className="font-medium">Company:</span> {user.companyName}</p>
        <p className="mt-1 capitalize"><span className="font-medium">Type:</span> {user.companyType}</p>
      </div>
      <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        Save changes
      </button>
    </form>
  );
}
