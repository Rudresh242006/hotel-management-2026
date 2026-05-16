import { Loader2 } from "lucide-react";

export function LoadingScreen({ role, label = "Loading…" }: { role: "waiter" | "kitchen" | "counter"; label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: `var(--${role})` }} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
