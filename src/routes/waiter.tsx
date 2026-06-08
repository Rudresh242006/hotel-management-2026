import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleHeader, ThemeToggle } from "@/components/RoleHeader";
import {
  CATEGORIES,
  fetchFloors,
  fetchFloorSections,
  fetchMenu,
  fetchOrderItems,
  fetchOrders,
  fetchTables,
  getTableLabel,
  useRealtimeQuery,
  type Floor,
  type FloorSection,
  type MenuItem,
  type Order,
  type OrderItem,
  type TableRow,
} from "@/lib/restaurant";
import { Minus, Plus, Receipt, Send, Utensils, X, Search, Eye, Building2, Thermometer } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/waiter")({
  component: WaiterPage,
  head: () => ({ meta: [{ title: "Waiter — Hotel Manager" }] }),
});

function WaiterPage() {
  const { data: floors, loading: lf } = useRealtimeQuery<Floor>(fetchFloors, ["floors"]);
  const { data: sections, loading: ls } = useRealtimeQuery<FloorSection>(fetchFloorSections, ["floor_sections"]);
  const { data: tables, loading: lt } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  // Selected floor state
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  // Auto-select first floor when floors load
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const loading = lf || ls || lt;
  const activeTable = tables.find((t) => t.id === activeTableId) ?? null;

  // Filter sections for the selected floor
  const floorSections = sections.filter((s) => s.floor_id === selectedFloorId);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId);

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader
        role="waiter"
        title="Floor Manager"
        subtitle="Manage tables & order entries"
        right={<ThemeToggle />}
      />
      <main className="mx-auto max-w-7xl px-6 py-8 animate-fade-up">
        {loading && <LoadingScreen role="waiter" label="Initializing table map…" />}

        {!loading && (
          <div className="space-y-6">
            {/* Floor Selector Tabs */}
            {floors.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center">
                <Building2 className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                {floors.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFloorId(f.id)}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none ${
                      selectedFloorId === f.id
                        ? "bg-waiter border-transparent text-waiter-foreground shadow-sm"
                        : "bg-secondary/40 border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {f.name}
                    <span className="ml-1.5 opacity-70">({f.code})</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/40 p-16 text-center text-muted-foreground">
                No floors configured in the system. Add floors in the Counter Admin panel first.
              </div>
            )}

            {/* Selected Floor Content */}
            {selectedFloor && (
              <div className="space-y-8">
                {floorSections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/40 p-16 text-center text-muted-foreground">
                    No active sections (AC / Non-AC) configured for{" "}
                    <span className="font-bold text-foreground">{selectedFloor.name}</span>.
                    Enable them in the Counter Admin panel under Table Layout.
                  </div>
                ) : (
                  floorSections.map((section) => {
                    const sectionTables = tables.filter(
                      (t) => t.floor_id === selectedFloorId && t.is_ac === section.is_ac
                    );

                    return (
                      <div key={section.id} className="space-y-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                          <Thermometer className="h-4 w-4 text-waiter/70" />
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground/80">
                            {section.is_ac ? "AC" : "Non-AC"} Section ({sectionTables.length} Table
                            {sectionTables.length !== 1 ? "s" : ""})
                          </h3>
                        </div>

                        {/* Tables Grid */}
                        {sectionTables.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 py-4 pl-1">
                            No tables configured in this section yet. Configure them in the Counter Admin panel.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {sectionTables.map((t) => {
                              const free = t.status === "free";

                              return (
                                <button
                                  key={t.id}
                                  onClick={() => setActiveTableId(t.id)}
                                  className="group relative aspect-[1.1] overflow-hidden rounded-2xl border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none"
                                  style={{
                                    borderColor: free
                                      ? "rgba(var(--success-color), 0.2)"
                                      : "rgba(var(--destructive-color), 0.2)",
                                    boxShadow: free
                                      ? "0 4px 24px rgba(0,0,0,0.15), inset 0 0 12px oklch(0.72 0.16 142 / 4%)"
                                      : "0 4px 24px rgba(0,0,0,0.15), inset 0 0 12px oklch(0.55 0.22 25 / 4%)",
                                  }}
                                >
                                  {/* Status indicator bar at bottom */}
                                  <div
                                    className="absolute inset-x-0 bottom-0 h-1"
                                    style={{
                                      background: free ? "var(--success)" : "var(--destructive)",
                                    }}
                                  />

                                  <div className="flex h-full flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                      <Utensils className="h-4 w-4 text-muted-foreground/60" />
                                      <span
                                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border"
                                        style={{
                                          background: free
                                            ? "oklch(0.72 0.16 142 / 10%)"
                                            : "oklch(0.55 0.22 25 / 10%)",
                                          borderColor: free
                                            ? "var(--success)"
                                            : "var(--destructive)",
                                          color: free ? "var(--success)" : "var(--destructive)",
                                        }}
                                      >
                                        {free ? "Free" : "Busy"}
                                      </span>
                                    </div>

                                    <div>
                                      {/* Full Floor/Section label */}
                                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        {selectedFloor.code}/{section.is_ac ? "AC" : "Non-AC"}
                                      </p>
                                      <p className="text-3xl font-black text-foreground group-hover:text-waiter transition-colors">
                                        {t.table_number}T
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {activeTable && (
        <TableSheet
          table={activeTable}
          floors={floors}
          onClose={() => setActiveTableId(null)}
        />
      )}
    </div>
  );
}

function TableSheet({
  table,
  floors,
  onClose,
}: {
  table: TableRow;
  floors: Floor[];
  onClose: () => void;
}) {
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [halfCart, setHalfCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("__all__");
  const [showOrderSummary, setShowOrderSummary] = useState(false);

  const tableLabel = getTableLabel(table, floors);

  const tableOrders = orders.filter((o) => o.table_id === table.id && o.status !== "billed");
  const tableOrderItems = orderItems.filter((oi) => tableOrders.some((o) => o.id === oi.order_id));

  const billRows = useMemo(() => {
    const rows: {
      key: string;
      item: MenuItem;
      qty: number;
      halfQty: number;
      itemStatus: OrderItem["status"];
    }[] = [];
    tableOrderItems.forEach((oi) => {
      const item = menu.find((m) => m.id === oi.menu_item_id);
      if (!item) return;
      rows.push({
        key: oi.id,
        item,
        qty: oi.quantity,
        halfQty: oi.half_quantity || 0,
        itemStatus: oi.status,
      });
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

    const items: {
      order_id: string;
      menu_item_id: string;
      quantity: number;
      half_quantity: number;
    }[] = [];

    Object.entries(cart).forEach(([menu_item_id, quantity]) => {
      items.push({ order_id: order.id, menu_item_id, quantity, half_quantity: 0 });
    });

    Object.entries(halfCart).forEach(([menu_item_id, halfCount]) => {
      items.push({
        order_id: order.id,
        menu_item_id,
        quantity: halfCount * 0.5,
        half_quantity: halfCount,
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
    toast.success(`Order sent to kitchen · ${tableLabel}`);
  }

  async function generateBill() {
    if (tableOrders.length === 0) return;
    setBusy(true);
    await supabase
      .from("orders")
      .update({ status: "billed" })
      .in(
        "id",
        tableOrders.map((o) => o.id),
      );
    await supabase.from("tables").update({ status: "free" }).eq("id", table.id);
    setBusy(false);
    toast.success(`Bill generated · ${tableLabel} · ₹${billTotal.toFixed(2)}`);
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide sheet */}
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border/40 bg-card/95 shadow-2xl backdrop-blur-xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div>
            {/* Full table label badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-waiter/30 bg-waiter/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-waiter">
              {tableLabel}
            </span>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {tableOrders.length > 0 ? "Edit Seating Ticket" : "Create Order Ticket"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Current Table Billing List */}
          {billRows.length > 0 && (
            <section className="rounded-2xl border border-border/40 bg-secondary/35 p-5">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Active Order items
              </h3>
              <ul className="space-y-3 text-sm">
                {billRows.map((r) => {
                  const isHalf = r.halfQty > 0;
                  const displayQty = isHalf ? `${r.halfQty} half` : formatQty(Number(r.qty));
                  return (
                    <li
                      key={r.key}
                      className="flex items-center justify-between gap-3 border-b border-border/20 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="flex-1 font-medium text-foreground">
                        {displayQty} × {r.item.name}
                      </span>
                      <ItemStatusBadge
                        itemStatus={r.itemStatus}
                        unavailable={!r.item.is_available}
                      />
                      <span className="w-20 text-right font-semibold text-foreground">
                        ₹{(Number(r.qty) * Number(r.item.price)).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex justify-between border-t border-border/40 pt-4 text-base font-bold text-foreground">
                <span>Current Total</span>
                <span className="text-waiter">₹{billTotal.toFixed(2)}</span>
              </div>
            </section>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items or categories..."
              className="h-11 w-full rounded-xl border border-border/60 bg-background pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/60 focus:border-waiter focus:ring-1 focus:ring-waiter transition outline-none"
            />
          </div>

          {/* Category Quick Selector */}
          <div className="-mx-6 overflow-x-auto px-6">
            <div className="flex gap-2 pb-2">
              <CategoryChip active={activeCat === "__all__"} onClick={() => setActiveCat("__all__")}>
                Full Menu
              </CategoryChip>
              {allCategories.map((cat) => (
                <CategoryChip
                  key={cat}
                  active={activeCat === cat}
                  onClick={() => setActiveCat(cat)}
                >
                  {cat}
                </CategoryChip>
              ))}
            </div>
          </div>

          {/* Menu Items List */}
          <div className="space-y-6">
            {visibleCategories
              .filter((cat) => activeCat === "__all__" || cat === activeCat)
              .map((cat) => {
                const items = menu.filter(
                  (m) =>
                    m.category === cat &&
                    (!q ||
                      m.name.toLowerCase().includes(q) ||
                      m.category.toLowerCase().includes(q)),
                );
                if (items.length === 0) return null;
                return (
                  <section key={cat} className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {cat}
                    </h4>
                    <div className="space-y-2.5">
                      {items.map((m) => {
                        const qty = cart[m.id] ?? 0;
                        const halfQty = halfCart[m.id] ?? 0;
                        const disabled = !m.is_available;
                        return (
                          <div
                            key={m.id}
                            className={`flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 transition-all hover:bg-secondary/20 ${
                              disabled ? "opacity-35" : ""
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="font-semibold text-foreground truncate">{m.name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground font-semibold">
                                ₹{Number(m.price).toFixed(2)} {disabled && "· Sold Out"}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Full Portion Selector */}
                              <div className="flex items-center rounded-lg border border-border/60 bg-background p-1">
                                <button
                                  disabled={disabled || qty === 0}
                                  onClick={() => setQty(m.id, qty - 1)}
                                  className="h-7 w-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 active:scale-95 flex items-center justify-center transition"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-8 text-center text-xs font-bold tabular-nums text-foreground">
                                  {qty}
                                </span>
                                <button
                                  disabled={disabled}
                                  onClick={() => setQty(m.id, qty + 1)}
                                  className="h-7 w-7 rounded-md bg-waiter text-waiter-foreground hover:bg-waiter/90 active:scale-95 flex items-center justify-center transition"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Half Portion Selector */}
                              {m.allow_half && (
                                <div className="flex items-center rounded-lg border border-border/60 bg-background p-1 border-l pl-2">
                                  <button
                                    disabled={disabled || halfQty === 0}
                                    onClick={() => setHalfQty(m.id, halfQty - 1)}
                                    className="h-7 w-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 active:scale-95 flex items-center justify-center transition"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-10 text-center text-[10px] font-bold tracking-tight tabular-nums text-foreground">
                                    ½×{halfQty}
                                  </span>
                                  <button
                                    disabled={disabled}
                                    onClick={() => setHalfQty(m.id, halfQty + 1)}
                                    className="h-7 w-7 rounded-md bg-warning text-warning-foreground hover:bg-warning/90 active:scale-95 flex items-center justify-center transition"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
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
              <div className="rounded-xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
                No items match your search.
              </div>
            )}
          </div>
        </div>

        {/* Footer sticky bar */}
        <div className="border-t border-border/40 bg-card p-5">
          {(cartCount > 0 || halfCartCount > 0) && (
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-muted-foreground">
                New Additions ({cartCount} Full, {halfCartCount} Half)
              </span>
              <span className="font-bold text-waiter">
                + ₹{(cartTotal + halfCartTotal).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              disabled={busy || (cartCount === 0 && halfCartCount === 0)}
              onClick={() => setShowOrderSummary(true)}
              className="flex-1 btn-base font-bold bg-waiter text-waiter-foreground hover:bg-waiter/90 focus:ring-2 focus:ring-waiter/50 active:scale-[0.98]"
            >
              <Eye className="h-4 w-4" />
              <span>Review Order</span>
            </button>
            <button
              disabled={busy || tableOrders.length === 0}
              onClick={generateBill}
              className="flex-1 btn-base font-bold border border-border/80 bg-secondary/40 hover:bg-secondary/70 text-foreground active:scale-[0.98]"
            >
              <Receipt className="h-4 w-4" />
              <span>Checkout Bill</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Confirmation Modal */}
      {showOrderSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowOrderSummary(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card p-6 shadow-2xl animate-fade-up">
            <div className="mb-4 flex items-center justify-between border-b border-border/20 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Confirm Order</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dispatching to kitchen for{" "}
                  <span className="font-bold text-waiter">{tableLabel}</span>
                </p>
              </div>
              <button
                onClick={() => setShowOrderSummary(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 space-y-2.5 max-h-60 overflow-y-auto">
              {Object.entries(cart).map(([id, qty]) => {
                const m = menu.find((x) => x.id === id);
                if (!m || qty === 0) return null;
                return (
                  <div key={id} className="flex justify-between text-sm text-foreground/80">
                    <span>
                      {qty} × {m.name}
                    </span>
                    <span className="font-semibold">₹{(Number(m.price) * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              {Object.entries(halfCart).map(([id, qty]) => {
                const m = menu.find((x) => x.id === id);
                if (!m || qty === 0) return null;
                return (
                  <div key={id} className="flex justify-between text-sm text-foreground/80">
                    <span>
                      {qty} half × {m.name}
                    </span>
                    <span className="font-semibold">
                      ₹{((Number(m.price) / 2) * qty).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mb-6 border-t border-border/25 pt-4">
              <div className="flex justify-between text-base font-extrabold text-foreground">
                <span>Subtotal</span>
                <span className="text-waiter">₹{(cartTotal + halfCartTotal).toFixed(2)}</span>
              </div>
            </div>

            <button
              disabled={busy}
              onClick={() => {
                setShowOrderSummary(false);
                placeOrder();
              }}
              className="w-full btn-base font-bold bg-waiter text-waiter-foreground hover:bg-waiter/90 active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              <span>Dispatch Order to Kitchen</span>
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
  let bg = "oklch(0.80 0.14 85 / 15%)";
  let border = "oklch(0.80 0.14 85 / 30%)";
  let text = "var(--warning)";

  if (unavailable) {
    label = "Sold Out";
    bg = "oklch(0.55 0.22 25 / 15%)";
    border = "oklch(0.55 0.22 25 / 30%)";
    text = "var(--destructive)";
  } else if (itemStatus === "ready") {
    label = "Ready";
    bg = "oklch(0.72 0.16 142 / 15%)";
    border = "oklch(0.72 0.16 142 / 30%)";
    text = "var(--success)";
  }

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ background: bg, borderColor: border, color: text }}
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
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus:outline-none ${
        active
          ? "bg-waiter border-transparent text-waiter-foreground shadow-sm"
          : "bg-secondary/40 border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-border"
      }`}
    >
      {children}
    </button>
  );
}
