import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { Minus, Plus, Receipt, Send, Utensils, X } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/waiter")({
  component: WaiterPage,
  head: () => ({ meta: [{ title: "Waiter — Hotel Manager" }] }),
});

function WaiterPage() {
  const { data: tables, loading } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  const activeTable = tables.find((t) => t.id === activeTableId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader role="waiter" title="Floor View" subtitle="Tap a table to manage its order" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading && <LoadingScreen role="waiter" label="Loading tables…" />}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {tables.map((t) => {
            const free = t.status === "free";
            return (
              <button
                key={t.id}
                onClick={() => setActiveTableId(t.id)}
                className="group relative aspect-square overflow-hidden rounded-2xl border-2 p-4 text-left transition hover:scale-[1.02] active:scale-100"
                style={{
                  background: free ? "color-mix(in oklab, var(--success) 18%, var(--card))" : "color-mix(in oklab, var(--destructive) 18%, var(--card))",
                  borderColor: free ? "var(--success)" : "var(--destructive)",
                }}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Utensils className="h-5 w-5 opacity-60" />
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase"
                      style={{
                        background: free ? "var(--success)" : "var(--destructive)",
                        color: free ? "var(--success-foreground)" : "var(--destructive-foreground)",
                      }}
                    >
                      {free ? "Free" : "Occupied"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Table</p>
                    <p className="text-4xl font-bold">{t.table_number}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {activeTable && (
        <TableSheet table={activeTable} onClose={() => setActiveTableId(null)} />
      )}
    </div>
  );
}

function TableSheet({ table, onClose }: { table: TableRow; onClose: () => void }) {
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const tableOrders = orders.filter((o) => o.table_id === table.id && o.status !== "billed");
  const tableOrderItems = orderItems.filter((oi) => tableOrders.some((o) => o.id === oi.order_id));

  const billRows = useMemo(() => {
    const rows: { key: string; item: MenuItem; qty: number; orderStatus: Order["status"] }[] = [];
    tableOrderItems.forEach((oi) => {
      const item = menu.find((m) => m.id === oi.menu_item_id);
      const order = tableOrders.find((o) => o.id === oi.order_id);
      if (!item || !order) return;
      rows.push({ key: oi.id, item, qty: oi.quantity, orderStatus: order.status });
    });
    return rows;
  }, [tableOrderItems, menu, tableOrders]);

  const billTotal = billRows.reduce((sum, r) => sum + r.qty * Number(r.item.price), 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const m = menu.find((x) => x.id === id);
    return sum + (m ? Number(m.price) * qty : 0);
  }, 0);

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const n = { ...c };
      if (qty <= 0) delete n[id];
      else n[id] = qty;
      return n;
    });
  }

  async function placeOrder() {
    if (cartCount === 0) return;
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ table_id: table.id, status: "placed" })
      .select()
      .single();
    if (error || !order) {
      toast.error("Failed to create order");
      setBusy(false);
      return;
    }
    const items = Object.entries(cart).map(([menu_item_id, quantity]) => ({
      order_id: order.id,
      menu_item_id,
      quantity,
    }));
    const { error: e2 } = await supabase.from("order_items").insert(items);
    if (e2) {
      toast.error("Failed to add items");
      setBusy(false);
      return;
    }
    if (table.status === "free") {
      await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);
    }
    setCart({});
    setBusy(false);
    toast.success(`Order sent to counter — Table ${table.table_number}`);
  }

  async function generateBill() {
    if (tableOrders.length === 0) return;
    setBusy(true);
    await supabase.from("orders").update({ status: "billed" }).in("id", tableOrders.map((o) => o.id));
    await supabase.from("tables").update({ status: "free" }).eq("id", table.id);
    setBusy(false);
    toast.success(`Bill generated · $${billTotal.toFixed(2)}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="flex w-full max-w-2xl flex-col bg-background shadow-2xl">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "var(--waiter)", color: "var(--waiter-foreground)" }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Table {table.table_number}</p>
            <h2 className="text-xl font-bold">{tableOrders.length > 0 ? "Add more items" : "New order"}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {billRows.length > 0 && (
            <section className="mb-6 rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Current bill
              </h3>
              <ul className="space-y-2 text-sm">
                {billRows.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-2">
                    <span className="flex-1">{r.qty} × {r.item.name}</span>
                    <ItemStatusBadge orderStatus={r.orderStatus} unavailable={!r.item.is_available} />
                    <span className="w-16 text-right font-medium">${(r.qty * Number(r.item.price)).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold">
                <span>Total</span>
                <span>${billTotal.toFixed(2)}</span>
              </div>
            </section>
          )}

          {CATEGORIES.map((cat) => {
            const items = menu.filter((m) => m.category === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat} className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                <div className="space-y-2">
                  {items.map((m) => {
                    const qty = cart[m.id] ?? 0;
                    const disabled = !m.is_available;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between rounded-lg border bg-card p-3 ${
                          disabled ? "opacity-40" : ""
                        }`}
                      >
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${Number(m.price).toFixed(2)} {disabled && "· Unavailable"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={disabled || qty === 0}
                            onClick={() => setQty(m.id, qty - 1)}
                            className="rounded-md border p-2 disabled:opacity-30"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-6 text-center font-semibold">{qty}</span>
                          <button
                            disabled={disabled}
                            onClick={() => setQty(m.id, qty + 1)}
                            className="rounded-md border p-2 disabled:opacity-30"
                            style={{ background: "var(--waiter)", color: "var(--waiter-foreground)", borderColor: "transparent" }}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="border-t bg-card p-4">
          {cartCount > 0 && (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{cartCount} new item(s)</span>
              <span className="font-semibold">${cartTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy || cartCount === 0}
              onClick={placeOrder}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
              style={{ background: "var(--waiter)", color: "var(--waiter-foreground)" }}
            >
              <Send className="h-4 w-4" />
              {tableOrders.length > 0 ? "Add More Items" : "Place Order"}
            </button>
            <button
              disabled={busy || tableOrders.length === 0}
              onClick={generateBill}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-semibold disabled:opacity-40"
            >
              <Receipt className="h-4 w-4" />
              Generate Bill
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ItemStatusBadge({
  orderStatus,
  unavailable,
}: {
  orderStatus: Order["status"];
  unavailable: boolean;
}) {
  let label = "Sent";
  let bg = "var(--muted)";
  let color = "var(--foreground)";
  if (unavailable) {
    label = "Unavailable";
    bg = "var(--destructive)";
    color = "var(--destructive-foreground)";
  } else if (orderStatus === "ready") {
    label = "Ready";
    bg = "var(--success)";
    color = "var(--success-foreground)";
  } else if (orderStatus === "preparing" || orderStatus === "in_kitchen") {
    label = "Preparing";
    bg = "var(--warning)";
    color = "white";
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}
