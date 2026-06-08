import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleHeader, ThemeToggle } from "@/components/RoleHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CATEGORIES,
  fetchFloors,
  fetchMenu,
  fetchOrderItems,
  fetchOrders,
  fetchTables,
  getTableLabel,
  useRealtimeQuery,
  type Floor,
  type MenuItem,
  type Order,
  type OrderItem,
  type TableRow,
} from "@/lib/restaurant";
import { Flame, CheckCircle2, Ban, Search, BookOpen } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
  head: () => ({ meta: [{ title: "Kitchen — Hotel Manager" }] }),
});

function KitchenPage() {
  const { data: floors } = useRealtimeQuery<Floor>(fetchFloors, ["floors"]);
  const { data: tables, loading: lt } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: menu, loading: lm } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders, loading: lo } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems, loading: loi } = useRealtimeQuery<OrderItem>(fetchOrderItems, [
    "order_items",
  ]);
  const initialLoading = lt || lm || lo || loi;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const [view, setView] = useState<"active" | "ready">("active");

  const THIRTY_MIN = 30 * 60 * 1000;
  const activeQueue = orders.filter((o) => ["in_kitchen", "preparing"].includes(o.status));
  const readyArchive = orders
    .filter((o) => o.status === "ready" && now - new Date(o.updated_at).getTime() < THIRTY_MIN)
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const queue = view === "active" ? activeQueue : readyArchive;

  async function setItemStatus(itemId: string, orderId: string, status: "preparing" | "ready") {
    await supabase.from("order_items").update({ status }).eq("id", itemId);
    const updated = orderItems.map((oi) => (oi.id === itemId ? { ...oi, status } : oi));
    const mine = updated.filter((oi) => oi.order_id === orderId);
    let next: Order["status"] = "in_kitchen";
    if (mine.every((i) => i.status === "ready")) next = "ready";
    else if (mine.some((i) => i.status === "preparing" || i.status === "ready")) next = "preparing";
    await supabase
      .from("orders")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  }

  async function setOrderStatus(orderId: string, status: "preparing" | "ready") {
    await supabase.from("order_items").update({ status }).eq("order_id", orderId);
    await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    toast.success(status === "preparing" ? "Order marked preparing" : "Order marked ready");
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader
        role="kitchen"
        title="Kitchen Dispatch"
        subtitle="Live tickets from waiter entries"
        right={<ThemeToggle />}
      />
      {initialLoading ? (
        <LoadingScreen role="kitchen" label="Synchronizing kitchen backlog…" />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.6fr_1fr] animate-fade-up">
          {/* Active Ticket backlog */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 rounded-xl bg-secondary/80 border border-border/40 p-1">
                <button
                  onClick={() => setView("active")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
                    view === "active"
                      ? "bg-kitchen text-kitchen-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Active Queue ({activeQueue.length})</span>
                </button>
                <button
                  onClick={() => setView("ready")}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
                    view === "ready"
                      ? "bg-success text-success-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Ready ({readyArchive.length})</span>
                </button>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-xl border border-kitchen/30 bg-kitchen/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-kitchen hover:bg-kitchen/25 transition active:scale-95">
                    <BookOpen className="h-4 w-4" />
                    <span>Out of Stock (86)</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto border border-border/40 bg-card/95 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                      <Ban className="h-5 w-5 text-kitchen" />
                      <span>Flag Stock Status (86)</span>
                    </DialogTitle>
                  </DialogHeader>
                  <Menu86List menu={menu} />
                </DialogContent>
              </Dialog>
            </div>

            {queue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/40 p-16 text-center text-muted-foreground leading-relaxed">
                {view === "active"
                  ? "Kitchen is currently idle. No incoming orders."
                  : "No orders marked ready in the last 30 minutes."}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {queue.map((o) => {
                  const table = tables.find((t) => t.id === o.table_id);
                  const tableLabel = table ? getTableLabel(table, floors) : "??";
                  const items = orderItems.filter((oi) => oi.order_id === o.id);

                  const accentColor =
                    o.status === "ready"
                      ? "var(--success)"
                      : o.status === "preparing"
                        ? "var(--warning)"
                        : "var(--kitchen)";

                  return (
                    <article
                      key={o.id}
                      className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-lg flex flex-col justify-between"
                      style={{ borderTop: `5px solid ${accentColor}` }}
                    >
                      <div>
                        {/* Ticket header */}
                        <header className="flex items-center justify-between border-b border-border/20 px-4 py-3 bg-secondary/10">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/75">
                              Table
                            </p>
                            {/* Full floor/AC/number label */}
                            <p
                              className="text-2xl font-black text-foreground leading-tight"
                              style={{ letterSpacing: "-0.02em" }}
                            >
                              {tableLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-muted-foreground">
                              {new Date(o.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p
                              className="mt-1 text-[9px] font-extrabold uppercase tracking-wider"
                              style={{ color: accentColor }}
                            >
                              {o.status.replace("_", " ")}
                            </p>
                          </div>
                        </header>

                        {/* Items list */}
                        <ul className="divide-y divide-border/20 px-4 py-1">
                          {items.map((it) => {
                            const m = menu.find((x) => x.id === it.menu_item_id);
                            const itemAccent =
                              it.status === "ready"
                                ? "var(--success)"
                                : it.status === "preparing"
                                  ? "var(--warning)"
                                  : "var(--kitchen)";
                            const isHalf = it.half_quantity > 0;
                            const displayQty = isHalf
                              ? `${it.half_quantity} half`
                              : Number(it.quantity);
                            return (
                              <li key={it.id} className="flex items-center gap-3 py-3.5">
                                <span
                                  className="text-2xl font-black tabular-nums"
                                  style={{ color: itemAccent }}
                                >
                                  {displayQty}×
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground leading-snug">
                                    {m?.name ?? "Unknown"}
                                  </p>
                                  <p
                                    className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
                                    style={{ color: itemAccent }}
                                  >
                                    {it.status.replace("_", " ")}
                                  </p>
                                </div>
                                {m && !m.is_available && (
                                  <span className="rounded-full bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-[8px] font-bold uppercase text-destructive tracking-wide">
                                    Out
                                  </span>
                                )}

                                {/* Item Action Toggles */}
                                <div className="flex gap-1.5 pl-2">
                                  <button
                                    disabled={it.status === "preparing" || it.status === "ready"}
                                    onClick={() => setItemStatus(it.id, o.id, "preparing")}
                                    className="h-8 w-8 rounded-lg border border-border/60 bg-background hover:bg-secondary hover:text-foreground disabled:opacity-20 transition flex items-center justify-center"
                                    title="Mark item cooking"
                                  >
                                    <Flame className="h-4 w-4" />
                                  </button>
                                  <button
                                    disabled={it.status === "ready"}
                                    onClick={() => setItemStatus(it.id, o.id, "ready")}
                                    className="h-8 w-8 rounded-lg bg-kitchen text-kitchen-foreground hover:bg-kitchen/90 disabled:opacity-20 transition flex items-center justify-center"
                                    title="Mark item ready"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Group bulk actions */}
                      <div className="flex gap-2.5 p-3.5 border-t border-border/20 bg-secondary/10">
                        <button
                          disabled={items.every(
                            (i) => i.status === "preparing" || i.status === "ready",
                          )}
                          onClick={() => setOrderStatus(o.id, "preparing")}
                          className="flex-1 btn-base font-bold border border-border/80 bg-secondary/40 hover:bg-secondary/70 text-foreground py-2 text-xs rounded-xl active:scale-[0.98] transition"
                        >
                          <Flame className="h-4 w-4" />
                          <span>Cook All</span>
                        </button>
                        <button
                          disabled={items.every((i) => i.status === "ready")}
                          onClick={() => setOrderStatus(o.id, "ready")}
                          className="flex-1 btn-base font-bold bg-kitchen text-kitchen-foreground hover:bg-kitchen/90 py-2 text-xs rounded-xl active:scale-[0.98] transition"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Ready All</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* 86 Stock Availability Side Panel */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                <Ban className="h-4 w-4 text-kitchen" />
                <span>Out of Stock (86)</span>
              </h2>
              <Menu86Search menu={menu} />
            </div>
            <Menu86List menu={menu} />
          </section>
        </main>
      )}
    </div>
  );
}

function Menu86Search({ menu }: { menu: MenuItem[] }) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? menu.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    : menu;
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter ingredients..."
        className="h-8 w-44 rounded-xl border border-border/60 bg-card pl-8 pr-3 text-xs text-foreground placeholder-muted-foreground/60 focus:border-kitchen focus:ring-1 focus:ring-kitchen outline-none transition"
      />
      {query.trim() && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">
          {filtered.length}
        </span>
      )}
    </div>
  );
}

function Menu86List({ menu }: { menu: MenuItem[] }) {
  const [query, setQuery] = useState("");
  async function toggleAvail(item: MenuItem) {
    await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    toast.success(
      item.is_available ? `${item.name} 86ed (out of stock)` : `${item.name} back in stock`,
    );
  }
  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-card p-5 shadow-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter menu items..."
          className="h-9 w-full rounded-xl border border-border/60 bg-background pl-9 pr-3 text-xs text-foreground placeholder-muted-foreground/60 focus:border-kitchen focus:ring-1 focus:ring-kitchen outline-none transition"
        />
      </div>

      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category)])).map((cat) => {
          const items = menu.filter(
            (m) =>
              m.category === cat &&
              (!q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)),
          );
          if (!items.length) return null;
          return (
            <div key={cat} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {cat}
              </p>
              <ul className="space-y-1.5">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-secondary/25 border border-border/20 px-3 py-2 hover:bg-secondary/40 transition"
                  >
                    <span
                      className={`text-xs font-semibold ${m.is_available ? "text-foreground" : "text-muted-foreground/50 line-through"}`}
                    >
                      {m.name}
                    </span>
                    <button
                      onClick={() => toggleAvail(m)}
                      className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide border transition ${
                        m.is_available
                          ? "bg-success/10 border-success/30 text-success hover:bg-success/20"
                          : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                      }`}
                    >
                      {m.is_available ? "In Stock" : "86ed Out"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
