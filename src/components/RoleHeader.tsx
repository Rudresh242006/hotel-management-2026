import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function RoleHeader({
  role,
  title,
  subtitle,
  right,
}: {
  role: "waiter" | "counter" | "kitchen";
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-10 border-b shadow-sm"
      style={{ background: `var(--${role})`, color: `var(--${role}-foreground)` }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm opacity-90 hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" /> Roles
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] opacity-80">{role} screen</p>
            <h1 className="text-2xl font-bold leading-tight">{title}</h1>
            {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </header>
  );
}
