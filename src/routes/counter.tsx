import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleHeader } from "@/components/RoleHeader";
import {
  CATEGORIES,
  fetchMenu,
  fetchOrderItems,
  fetchOrders,
  fetchTables,
  useRealtimeQuery,
  type MenuItem,
  type Order,
  type OrderItem,
  type TableRow,
} from "@/lib/restaurant";
import { ChefHat, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/counter")({
  component: CounterPage,
  head: () => ({ meta: [{ title: "Counter — Hotel Manager" }] }),
});

function CounterPage() {
  const { data: tables } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);

  // notify when orders become ready
  const seenReady = useRef<Set<string>>(new Set());
  useEffect(() => {
    orders.forEach((o) => {
      if (o.status === "ready" && !seenReady.current.has(o.id)) {
        seenReady.current.add(o.id);
        const t = tables.find((x) => x.id === o.table_id);
        toast.success(`Kitchen: order ready for Table ${t?.table_number ?? "?"}`);
      }
    });
  }, [orders, tables]);

  const active = orders.filter((o) => o.status !== "billed");

  async function forwardToKitchen(id: string) {
    await supabase.from("orders").update({ status: "in_kitchen" }).eq("id", id);
    toast.success("Forwarded to kitchen");
  }

  async function toggleAvail(item: MenuItem) {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader role="counter" title="Counter Console" subtitle="Live orders & menu availability" />
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Incoming orders ({active.length})
          </h2>
          <div className="space-y-3">
            {active.length === 0 && (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                No active orders. Waiting…
              </div>
            )}
            {active.map((o) => {
              const table = tables.find((t) => t.id === o.table_id);
              const items = orderItems.filter((oi) => oi.order_id === o.id);
              return (
                <article key={o.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <header className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg font-bold"
                        style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
                      >
                        {table?.table_number}
                      </div>
                      <div>
                        <p className="font-semibold">Table {table?.table_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </header>
                  <ul className="mb-3 space-y-1 text-sm">
                    {items.map((it) => {
                      const m = menu.find((x) => x.id === it.menu_item_id);
                      return (
                        <li key={it.id} className="flex justify-between">
                          <span>{it.quantity} × {m?.name ?? "?"}</span>
                          <span className="text-muted-foreground">
                            ${m ? (Number(m.price) * it.quantity).toFixed(2) : "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex justify-end gap-2">
                    {o.status === "placed" && (
                      <button
                        onClick={() => forwardToKitchen(o.id)}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
                        style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
                      >
                        <ChefHat className="h-4 w-4" /> Forward to Kitchen
                      </button>
                    )}
                    {o.status === "ready" && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-sm font-semibold" style={{ color: "var(--success-foreground)", background: "color-mix(in oklab, var(--success) 25%, transparent)" }}>
                        <CheckCircle2 className="h-4 w-4" /> Ready to serve
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Menu availability
          </h2>
          <div className="space-y-4 rounded-xl border bg-card p-4">
            {CATEGORIES.map((cat) => {
              const items = menu.filter((m) => m.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
                  <ul className="space-y-1">
                    {items.map((m) => (
                      <li key={m.id} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent">
                        <span className={`text-sm ${m.is_available ? "" : "text-muted-foreground line-through"}`}>
                          {m.name}
                        </span>
                        <button
                          onClick={() => toggleAvail(m)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            m.is_available
                              ? "bg-success/20 text-foreground"
                              : "bg-destructive/20 text-foreground"
                          }`}
                        >
                          {m.is_available ? "Available" : "Unavailable"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; bg: string }> = {
    placed: { label: "New", bg: "var(--warning)" },
    in_kitchen: { label: "In kitchen", bg: "var(--counter)" },
    preparing: { label: "Preparing", bg: "var(--counter)" },
    ready: { label: "Ready", bg: "var(--success)" },
    billed: { label: "Billed", bg: "var(--muted)" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-semibold uppercase"
      style={{ background: s.bg, color: "white" }}
    >
      {s.label}
    </span>
  );
}
