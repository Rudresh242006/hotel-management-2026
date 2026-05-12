import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleHeader } from "@/components/RoleHeader";
import {
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
import { Flame, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
  head: () => ({ meta: [{ title: "Kitchen — Hotel Manager" }] }),
});

function KitchenPage() {
  const { data: tables } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);

  const queue = orders.filter((o) => ["in_kitchen", "preparing", "ready"].includes(o.status));

  async function setStatus(id: string, status: Order["status"]) {
    await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast.success(status === "preparing" ? "Marked preparing" : "Marked ready");
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader role="kitchen" title="Kitchen Display" subtitle="Tickets from counter" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {queue.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center text-muted-foreground">
            No tickets. Kitchen idle.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((o) => {
              const table = tables.find((t) => t.id === o.table_id);
              const items = orderItems.filter((oi) => oi.order_id === o.id);
              const accent =
                o.status === "ready" ? "var(--success)" : o.status === "preparing" ? "var(--warning)" : "var(--kitchen)";
              return (
                <article
                  key={o.id}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm"
                  style={{ borderTop: `6px solid ${accent}` }}
                >
                  <header className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Table</p>
                      <p className="text-3xl font-bold">{table?.table_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleTimeString()}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase" style={{ color: accent }}>
                        {o.status.replace("_", " ")}
                      </p>
                    </div>
                  </header>
                  <ul className="space-y-1 border-y px-4 py-3">
                    {items.map((it) => {
                      const m = menu.find((x) => x.id === it.menu_item_id);
                      return (
                        <li key={it.id} className="flex items-baseline gap-3">
                          <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>
                            {it.quantity}×
                          </span>
                          <span className="text-base">{m?.name ?? "?"}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex gap-2 p-3">
                    <button
                      disabled={o.status === "preparing" || o.status === "ready"}
                      onClick={() => setStatus(o.id, "preparing")}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40"
                    >
                      <Flame className="h-4 w-4" /> Preparing
                    </button>
                    <button
                      disabled={o.status === "ready"}
                      onClick={() => setStatus(o.id, "ready")}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40"
                      style={{ background: "var(--kitchen)", color: "var(--kitchen-foreground)" }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Ready
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
