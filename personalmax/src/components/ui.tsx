import type { ReactNode } from "react";

// Small shared UI vocabulary so every page reads as one system.

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-edge bg-surface p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-edge bg-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:text-ink disabled:opacity-50",
} as const;

export const inputClass =
  "w-full rounded-xl border border-edge bg-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition focus:border-accent";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted/80">{hint}</span> : null}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
    >
      {message}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-edge px-6 py-10 text-center">
      <p className="font-medium text-muted">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted/70">{hint}</p> : null}
    </div>
  );
}

export function XpBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
