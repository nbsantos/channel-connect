import { ReactNode } from "react";

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-navy-border bg-navy-elevated p-6 shadow-sm shadow-black/30">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  const styles = {
    default: "bg-brand-surface text-slate-200 ring-1 ring-navy-border",
    success: "bg-green-950 text-green-400 ring-1 ring-green-800",
    warning: "bg-amber-950 text-amber-400 ring-1 ring-amber-800",
    danger: "bg-red-950 text-red-400 ring-1 ring-red-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{message}</p>;
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-navy-border bg-navy-elevated p-5 shadow-sm shadow-black/30">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export const fieldClass = "mt-1 w-full rounded-lg border border-navy-border bg-brand-surface px-3 py-2 text-white placeholder:text-slate-500";
export const labelClass = "block text-sm font-medium text-slate-300";
export const btnPrimaryClass = "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50";
export const btnPrimaryFullClass = "w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-light disabled:opacity-50";
