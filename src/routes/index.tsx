import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, ClipboardList, Utensils } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Hotel Manager — Restaurant Operations" },
      { name: "description", content: "Tablet-friendly restaurant management for waiters, counter, and kitchen." },
    ],
  }),
});

const roles = [
  { to: "/waiter", label: "Waiter", desc: "Take orders & manage tables", icon: Utensils, color: "waiter" },
  { to: "/counter", label: "Counter", desc: "Receive & forward orders", icon: ClipboardList, color: "counter" },
  { to: "/kitchen", label: "Kitchen", desc: "Prepare & mark ready", icon: ChefHat, color: "kitchen" },
] as const;

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-14 text-center">
          <p className="text-sm tracking-[0.3em] text-muted-foreground uppercase">Restaurant OS</p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">Hotel Manager</h1>
          <p className="mt-3 text-muted-foreground">Pick a role to begin your shift.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.to}
                to={r.to}
                className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl"
                  style={{ background: `var(--${r.color})`, color: `var(--${r.color}-foreground)` }}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-semibold">{r.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                <div
                  className="mt-6 inline-flex text-sm font-medium"
                  style={{ color: `var(--${r.color})` }}
                >
                  Open {r.label} screen →
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
