import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { getTheme, toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  const handleToggle = () => {
    toggleTheme();
    setTheme(getTheme());
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 text-foreground transition hover:bg-accent hover:text-foreground active:scale-95 focus:outline-none cursor-pointer"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-warning" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
      )}
    </button>
  );
}

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
  // Define glow colors and labels based on roles
  const roleColorMap = {
    waiter: "text-waiter bg-waiter/15 border-waiter/30",
    counter: "text-counter bg-counter/15 border-counter/30",
    kitchen: "text-kitchen bg-kitchen/15 border-kitchen/30",
  };

  const roleLabels = {
    waiter: "Floor Waiter",
    counter: "Cashier Counter",
    kitchen: "Kitchen Display",
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-semibold tracking-wide text-foreground transition hover:bg-accent hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Shift Switch</span>
          </Link>

          <div className="h-8 w-px bg-border/40" />

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleColorMap[role]}`}
              >
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />
                {roleLabels[role]}
              </span>
              {subtitle && (
                <span className="hidden text-xs text-muted-foreground sm:inline-block">
                  · {subtitle}
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
