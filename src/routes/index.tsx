import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, ClipboardList, Utensils, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Hotel Manager — Restaurant Operations" },
      {
        name: "description",
        content: "Tablet-friendly restaurant management for waiters, counter, and kitchen.",
      },
    ],
  }),
});

const roles = [
  {
    to: "/waiter",
    label: "Waiter Console",
    desc: "Manage table layouts, create orders, and handle live billing details.",
    icon: Utensils,
    color: "waiter",
    glowClass: "hover:border-waiter/40 hover:shadow-[0_0_30px_oklch(0.65_0.18_245_/_15%)]",
  },
  {
    to: "/counter",
    label: "Counter Console",
    desc: "Review incoming orders, control menu availability, and manage database panels.",
    icon: ClipboardList,
    color: "counter",
    glowClass: "hover:border-counter/40 hover:shadow-[0_0_30px_oklch(0.65_0.22_32_/_15%)]",
  },
  {
    to: "/kitchen",
    label: "Kitchen Display",
    desc: "Monitor active order queue tickets, view ingredients, and report readiness.",
    icon: ChefHat,
    color: "kitchen",
    glowClass: "hover:border-kitchen/40 hover:shadow-[0_0_30px_oklch(0.70_0.17_145_/_15%)]",
  },
] as const;

function Home() {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      {/* Decorative background ambient light */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[128px] pointer-events-none" />

      <div className="w-full max-w-5xl">
        <header className="mb-16 text-center animate-fade-up">
          <span className="badge border border-primary/20 bg-primary/10 text-primary mb-3">
            v2026.1 Stable
          </span>
          <p className="text-xs font-bold tracking-[0.4em] text-muted-foreground uppercase">
            Restaurant Operating System
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            Hotel <span className="gradient-text font-black">Manager</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
            Select your assigned role console below to log into your shift dashboard.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3 animate-fade-up animate-stagger-1">
          {roles.map((r, index) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.to}
                to={r.to}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 ${r.glowClass}`}
              >
                {/* Visual subtle highlight overlay */}
                <div
                  className="absolute inset-x-0 top-0 h-1 transition-opacity opacity-0 group-hover:opacity-100"
                  style={{ background: `var(--${r.color})` }}
                />

                <div>
                  <div
                    className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/5 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `color-mix(in oklab, var(--${r.color}) 12%, transparent)`,
                      color: `var(--${r.color})`,
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <h2 className="text-xl font-bold text-foreground transition-colors group-hover:text-white">
                    {r.label}
                  </h2>
                  <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-all duration-300 group-hover:gap-2"
                    style={{ color: `var(--${r.color})` }}
                  >
                    Launch Console
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase">
                    Shift {index + 1}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <footer className="mt-20 text-center text-xs text-muted-foreground/40 animate-fade-up animate-stagger-2">
          &copy; 2026 Hotel Manager. Designed for high efficiency restaurant workflows.
        </footer>
      </div>
    </div>
  );
}
