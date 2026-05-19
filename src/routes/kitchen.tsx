import { createFileRoute } from "@tanstack/react-router";
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
import { Flame, CheckCircle2, Ban } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
  head: () => ({ meta: [{ title: "Kitchen — Hotel Manager" }] }),
});

function KitchenPage() {
  const { data: tables, loading: lt } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: menu, loading: lm } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders, loading: lo } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems, loading: loi } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);
  const initialLoading = lt && lm && lo && loi;

  const queue = orders.filter((o) => ["in_kitchen", "preparing", "ready"].includes(o.status));

  async function syncOrderStatus(orderId: string) {
    const items = orderItems.filter((oi) => oi.order_id === orderId);
    if (items.length === 0) return;
    let next: Order["status"] = "in_kitchen";
    if (items.every((i) => i.status === "ready")) next = "ready";
    else if (items.some((i) => i.status === "preparing" || i.status === "ready")) next = "preparing";
    await supabase.from("orders").update({ status: next, updated_at: new Date().toISOString() }).eq("id", orderId);
  }

  async function setItemStatus(itemId: string, orderId: string, status: "preparing" | "ready") {
    await supabase.from("order_items").update({ status }).eq("id", itemId);
    // Optimistically sync — realtime refresh will reconcile
    const updated = orderItems.map((oi) => (oi.id === itemId ? { ...oi, status } : oi));
    const mine = updated.filter((oi) => oi.order_id === orderId);
    let next: Order["status"] = "in_kitchen";
    if (mine.every((i) => i.status === "ready")) next = "ready";
    else if (mine.some((i) => i.status === "preparing" || i.status === "ready")) next = "preparing";
    await supabase.from("orders").update({ status: next, updated_at: new Date().toISOString() }).eq("id", orderId);
  }

  async function setOrderStatus(orderId: string, status: "preparing" | "ready") {
    await supabase.from("order_items").update({ status }).eq("order_id", orderId);
    await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
    toast.success(status === "preparing" ? "Whole order: preparing" : "Whole order: ready");
  }

  async function toggleAvail(item: MenuItem) {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    toast.success(item.is_available ? `${item.name} marked unavailable` : `${item.name} available`);
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader role="kitchen" title="Kitchen Display" subtitle="Tickets from counter" />
      {initialLoading ? (
        <LoadingScreen role="kitchen" label="Loading tickets…" />
      ) : (
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tickets ({queue.length})
          </h2>
          {queue.length === 0 ? (
            <div className="rounded-xl border border-dashed p-16 text-center text-muted-foreground">
              No tickets. Kitchen idle.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
                            <span className="text-base flex-1">{m?.name ?? "?"}</span>
                            {m && !m.is_available && (
                              <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
                                Out
                              </span>
                            )}
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
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Ban className="h-4 w-4" /> 86 the menu
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
      )}
    </div>
  );
}
