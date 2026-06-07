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
import { Minus, Plus, Receipt, Send, Utensils, X, Search, Eye } from "lucide-react";
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
  const [halfCart, setHalfCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("__all__");
  const [showOrderSummary, setShowOrderSummary] = useState(false);

  const tableOrders = orders.filter((o) => o.table_id === table.id && o.status !== "billed");
  const tableOrderItems = orderItems.filter((oi) => tableOrders.some((o) => o.id === oi.order_id));

  const billRows = useMemo(() => {
    const rows: { key: string; item: MenuItem; qty: number; halfQty: number; itemStatus: OrderItem["status"] }[] = [];
    tableOrderItems.forEach((oi) => {
      const item = menu.find((m) => m.id === oi.menu_item_id);
      if (!item) return;
      rows.push({ key: oi.id, item, qty: oi.quantity, halfQty: oi.half_quantity || 0, itemStatus: oi.status });
    });
    return rows;
  }, [tableOrderItems, menu]);

  const billTotal = billRows.reduce((sum, r) => sum + r.qty * Number(r.item.price), 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const halfCartCount = Object.values(halfCart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const m = menu.find((x) => x.id === id);
    return sum + (m ? Number(m.price) * qty : 0);
  }, 0);
  const halfCartTotal = Object.entries(halfCart).reduce((sum, [id, qty]) => {
    const m = menu.find((x) => x.id === id);
    return sum + (m ? (Number(m.price) / 2) * qty : 0);
  }, 0);

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const n = { ...c };
      if (qty <= 0) delete n[id];
      else n[id] = qty;
      return n;
    });
  }

  function setHalfQty(id: string, qty: number) {
    setHalfCart((c) => {
      const n = { ...c };
      if (qty <= 0) delete n[id];
      else n[id] = qty;
      return n;
    });
  }

  function formatQty(q: number) {
    return Number.isInteger(q) ? String(q) : q.toString();
  }

  async function placeOrder() {
    if (cartCount === 0 && halfCartCount === 0) return;
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ table_id: table.id, status: "in_kitchen" })
      .select()
      .single();
    if (error || !order) {
      toast.error("Failed to create order");
      setBusy(false);
      return;
    }
    
    // Combine full and half items
    const items: { order_id: string; menu_item_id: string; quantity: number; half_quantity: number }[] = [];
    
    // Add full items
    Object.entries(cart).forEach(([menu_item_id, quantity]) => {
      items.push({ order_id: order.id, menu_item_id, quantity, half_quantity: 0 });
    });
    
    // Add half items (store half count separately)
    Object.entries(halfCart).forEach(([menu_item_id, halfCount]) => {
      items.push({ 
        order_id: order.id, 
        menu_item_id, 
        quantity: halfCount * 0.5, // Store as 0.5 for pricing
        half_quantity: halfCount // Store actual half count for display
      });
    });
    
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
    setHalfCart({});
    setBusy(false);
    toast.success(`Order sent to counter — Table ${table.table_number}`);
  }

  async function generateBill() {
    if (tableOrders.length === 0) return;
    setBusy(true);
    await supabase.from("orders").update({ status: "billed" }).in("id", tableOrders.map((o) => o.id));
    await supabase.from("tables").update({ status: "free" }).eq("id", table.id);
    setBusy(false);
    toast.success(`Bill generated · ₹${billTotal.toFixed(2)}`);
    onClose();
  }

  const q = search.trim().toLowerCase();
  const allCategories = Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category)]));
  const visibleCategories = allCategories.filter((cat) => {
    if (!q) return true;
    if (cat.toLowerCase().includes(q)) return true;
    const catItems = menu.filter((m) => m.category === cat);
    return catItems.some((m) => m.name.toLowerCase().includes(q));
  });

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
                {billRows.map((r) => {
                  const isHalf = r.halfQty > 0;
                  const displayQty = isHalf ? `${r.halfQty} half` : formatQty(Number(r.qty));
                  return (
                    <li key={r.key} className="flex items-center justify-between gap-2">
                      <span className="flex-1">{displayQty} × {r.item.name}</span>
                      <ItemStatusBadge itemStatus={r.itemStatus} unavailable={!r.item.is_available} />
                      <span className="w-16 text-right font-medium">₹{(Number(r.qty) * Number(r.item.price)).toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold">
                <span>Total</span>
                <span>₹{billTotal.toFixed(2)}</span>
              </div>
            </section>
          )}

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item or category…"
              className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm"
            />
            {q && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {menu.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).length}
              </span>
            )}
          </div>

          {/* Category quick-filter chips */}
          <div className="mb-4 -mx-6 overflow-x-auto px-6">
            <div className="flex gap-2 pb-1">
              <CategoryChip active={activeCat === "__all__"} onClick={() => setActiveCat("__all__")}>
                Full Menu
              </CategoryChip>
              {allCategories.map((cat) => (
                <CategoryChip key={cat} active={activeCat === cat} onClick={() => setActiveCat(cat)}>
                  {cat}
                </CategoryChip>
              ))}
            </div>
          </div>

          {visibleCategories
            .filter((cat) => activeCat === "__all__" || cat === activeCat)
            .map((cat) => {
            const items = menu.filter((m) => m.category === cat && (!q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)));
            if (items.length === 0) return null;
            return (
              <section key={cat} className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                <div className="space-y-2">
                  {items.map((m) => {
                    const qty = cart[m.id] ?? 0;
                    const halfQty = halfCart[m.id] ?? 0;
                    const disabled = !m.is_available;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between rounded-lg border bg-card p-3 ${
                          disabled ? "opacity-40" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{m.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{Number(m.price).toFixed(2)} {disabled && "· Unavailable"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              disabled={disabled || qty === 0}
                              onClick={() => setQty(m.id, qty - 1)}
                              className="rounded-md border p-2 disabled:opacity-30"
                              title="Remove one"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-semibold tabular-nums">{formatQty(qty)}</span>
                            <button
                              disabled={disabled}
                              onClick={() => setQty(m.id, qty + 1)}
                              className="rounded-md border p-2 disabled:opacity-30"
                              style={{ background: "var(--waiter)", color: "var(--waiter-foreground)", borderColor: "transparent" }}
                              title="Add one"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {m.allow_half && (
                            <div className="flex items-center gap-1 border-l pl-2">
                              <button
                                disabled={disabled || halfQty === 0}
                                onClick={() => setHalfQty(m.id, halfQty - 1)}
                                className="rounded-md border p-2 disabled:opacity-30"
                                title="Remove half"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-semibold tabular-nums text-xs">½×{formatQty(halfQty)}</span>
                              <button
                                disabled={disabled}
                                onClick={() => setHalfQty(m.id, halfQty + 1)}
                                className="rounded-md border p-2 disabled:opacity-30"
                                style={{ background: "var(--warning)", color: "var(--warning-foreground)", borderColor: "transparent" }}
                                title="Add half"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {visibleCategories.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No items match your search.
            </div>
          )}
        </div>

        <div className="border-t bg-card p-4">
          {(cartCount > 0 || halfCartCount > 0) && (
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatQty(cartCount)} full + {formatQty(halfCartCount)} half
              </span>
              <span className="font-semibold">₹{(cartTotal + halfCartTotal).toFixed(2)}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy || cartCount === 0 && halfCartCount === 0}
              onClick={() => setShowOrderSummary(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
              style={{ background: "var(--waiter)", color: "var(--waiter-foreground)" }}
            >
              <Eye className="h-4 w-4" />
              {tableOrders.length > 0 ? "View Order" : "View Order"}
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

      {/* Order Summary Modal */}
      {showOrderSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Order Summary</h2>
              <button
                onClick={() => setShowOrderSummary(false)}
                className="rounded-md p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(cart).map(([id, qty]) => {
                const m = menu.find((x) => x.id === id);
                if (!m || qty === 0) return null;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span>{formatQty(qty)} × {m.name}</span>
                    <span>₹{(Number(m.price) * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              {Object.entries(halfCart).map(([id, qty]) => {
                const m = menu.find((x) => x.id === id);
                if (!m || qty === 0) return null;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span>{formatQty(qty)} half × {m.name}</span>
                    <span>{formatQty(qty)} half</span>
                  </div>
                );
              })}
            </div>

            <div className="mb-4 border-t pt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{(cartTotal + halfCartTotal).toFixed(2)}</span>
              </div>
            </div>

            <button
              disabled={busy}
              onClick={() => {
                setShowOrderSummary(false);
                placeOrder();
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
              style={{ background: "var(--waiter)", color: "var(--waiter-foreground)" }}
            >
              <Send className="h-4 w-4" />
              Confirm & Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemStatusBadge({
  itemStatus,
  unavailable,
}: {
  itemStatus: OrderItem["status"];
  unavailable: boolean;
}) {
  let label = "Preparing";
  let bg: string = "var(--warning)";
  let color = "white";
  if (unavailable) {
    label = "Unavailable";
    bg = "var(--destructive)";
    color = "var(--destructive-foreground)";
  } else if (itemStatus === "ready") {
    label = "Ready";
    bg = "var(--success)";
    color = "var(--success-foreground)";
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

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
        active ? "" : "bg-card text-foreground hover:bg-accent"
      }`}
      style={active ? { background: "var(--waiter)", color: "var(--waiter-foreground)", borderColor: "transparent" } : undefined}
    >
      {children}
    </button>
  );
}
