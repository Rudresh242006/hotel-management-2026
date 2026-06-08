import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import {
  ChefHat,
  CheckCircle2,
  Plus,
  Trash2,
  Settings,
  ClipboardList,
  IndianRupee,
  Table as TableIcon,
  UtensilsCrossed,
  Search,
  History,
  BookOpen,
  Ban,
  Building2,
  Pencil,
  Check,
  X as XIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingScreen } from "@/components/LoadingScreen";

function formatQty(q: number) {
  if (Number.isInteger(q)) return String(q);
  return q.toString();
}

export const Route = createFileRoute("/counter")({
  component: CounterPage,
  head: () => ({ meta: [{ title: "Counter — Hotel Manager" }] }),
});

function CounterPage() {
  const [tab, setTab] = useState<"orders" | "admin">("orders");
  return (
    <div className="min-h-screen bg-background">
      <RoleHeader
        role="counter"
        title="Reception & Billing"
        subtitle="Manage live orders and store configurations"
        right={
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-xl bg-secondary/80 border border-border/40 p-1">
              <TabBtn
                active={tab === "orders"}
                onClick={() => setTab("orders")}
                icon={<ClipboardList className="h-4 w-4" />}
              >
                Orders Console
              </TabBtn>
              <TabBtn
                active={tab === "admin"}
                onClick={() => setTab("admin")}
                icon={<Settings className="h-4 w-4" />}
              >
                Store Admin
              </TabBtn>
            </div>
            <ThemeToggle />
          </div>
        }
      />
      <div className="animate-fade-up">{tab === "orders" ? <OrdersView /> : <AdminPanel />}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 focus:outline-none ${
        active
          ? "bg-counter text-counter-foreground shadow-md"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

/* ============ ORDERS VIEW ============ */

function OrdersView() {
  const { data: floors } = useRealtimeQuery<Floor>(fetchFloors, ["floors"]);
  const { data: tables, loading: lt } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: menu, loading: lm } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders, loading: lo } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems, loading: loi } = useRealtimeQuery<OrderItem>(fetchOrderItems, [
    "order_items",
  ]);
  const initialLoading = lt || lm || lo || loi;

  const seenReady = useRef<Set<string>>(new Set());
  useEffect(() => {
    orders.forEach((o) => {
      if (o.status === "ready" && !seenReady.current.has(o.id)) {
        seenReady.current.add(o.id);
        const t = tables.find((x) => x.id === o.table_id);
        const label = t ? getTableLabel(t, floors) : "?";
        toast.success(`Order for ${label} is ready to serve!`);
      }
    });
  }, [orders, tables, floors]);

  const [search, setSearch] = useState("");
  const active = orders.filter((o) => o.status !== "billed");
  const filteredOrders = active.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const table = tables.find((t) => t.id === o.table_id);
    const tableLabel = table ? getTableLabel(table, floors).toLowerCase() : "";
    if (tableLabel.includes(q)) return true;
    if (table?.table_number.toString().includes(q)) return true;
    const items = orderItems.filter((oi) => oi.order_id === o.id);
    return items.some((it) => {
      const m = menu.find((x) => x.id === it.menu_item_id);
      return m?.name.toLowerCase().includes(q);
    });
  });

  async function forwardToKitchen(id: string) {
    await supabase.from("orders").update({ status: "in_kitchen" }).eq("id", id);
    toast.success("Ticket forwarded to kitchen");
  }

  if (initialLoading) return <LoadingScreen role="counter" label="Loading floor transactions…" />;

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.5fr_1fr]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Incoming Orders ({filteredOrders.length})
          </h2>
          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-xl border border-counter/30 bg-counter/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-counter hover:bg-counter/25 transition active:scale-95">
                  <BookOpen className="h-4 w-4" />
                  <span>86 Availability</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto border border-border/40 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <Ban className="h-5 w-5 text-counter" />
                    <span>Menu Stock Availability</span>
                  </DialogTitle>
                </DialogHeader>
                <MenuAvailabilityList menu={menu} />
              </DialogContent>
            </Dialog>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search table, floor or item..."
                className="h-9 w-52 rounded-xl border border-border/60 bg-card pl-9 pr-3 text-xs text-foreground placeholder-muted-foreground/60 focus:border-counter focus:ring-1 focus:ring-counter outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/40 p-16 text-center text-muted-foreground">
              {search.trim()
                ? "No tickets found matching that criteria."
                : "All quiet. No active seating tickets."}
            </div>
          )}
          {filteredOrders.map((o) => {
            const table = tables.find((t) => t.id === o.table_id);
            const tableLabel = table ? getTableLabel(table, floors) : "??";
            const items = orderItems.filter((oi) => oi.order_id === o.id);
            return (
              <article
                key={o.id}
                className="rounded-2xl border border-border/40 bg-card p-5 shadow-lg transition hover:shadow-xl"
              >
                <header className="mb-4 flex items-center justify-between border-b border-border/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 min-w-[3rem] items-center justify-center rounded-xl font-black text-sm shadow-sm px-2"
                      style={{
                        background: "rgba(var(--counter-color), 0.12)",
                        color: "var(--counter)",
                      }}
                    >
                      {tableLabel}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{tableLabel}</h3>
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase">
                        Ordered at{" "}
                        {new Date(o.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </header>
                <ul className="mb-4 space-y-2.5 text-sm">
                  {items.map((it) => {
                    const m = menu.find((x) => x.id === it.menu_item_id);
                    const isHalf = it.half_quantity > 0;
                    const displayQty = isHalf
                      ? `${it.half_quantity} half`
                      : formatQty(Number(it.quantity));
                    return (
                      <li
                        key={it.id}
                        className="flex items-center justify-between gap-3 text-foreground/80 font-medium"
                      >
                        <span className="flex-1">
                          {displayQty} × {m?.name ?? "Unknown Item"}
                        </span>
                        <ItemStatusPill status={it.status} />
                        <span className="w-24 text-right font-semibold text-foreground">
                          {m ? `₹${(Number(m.price) * Number(it.quantity)).toFixed(2)}` : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-end gap-2 border-t border-border/20 pt-3">
                  {o.status === "placed" && (
                    <button
                      onClick={() => forwardToKitchen(o.id)}
                      className="btn-base font-bold bg-counter text-counter-foreground hover:bg-counter/90 active:scale-95 py-1.5 px-4 text-xs"
                    >
                      <ChefHat className="h-4 w-4" />
                      <span>Forward to Kitchen</span>
                    </button>
                  )}
                  {o.status === "ready" && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-success/30 bg-success/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-success">
                      <CheckCircle2 className="h-4 w-4 pulse-dot" />
                      <span>Ready to Serve</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            Live Availability List
          </h2>
        </div>
        <MenuAvailabilityList menu={menu} />
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; bg: string; border: string; text: string }> =
    {
      placed: {
        label: "New",
        bg: "oklch(0.80 0.14 85 / 15%)",
        border: "oklch(0.80 0.14 85 / 30%)",
        text: "var(--warning)",
      },
      in_kitchen: {
        label: "In Kitchen",
        bg: "oklch(0.80 0.14 85 / 15%)",
        border: "oklch(0.80 0.14 85 / 30%)",
        text: "var(--warning)",
      },
      preparing: {
        label: "Preparing",
        bg: "oklch(0.80 0.14 85 / 15%)",
        border: "oklch(0.80 0.14 85 / 30%)",
        text: "var(--warning)",
      },
      ready: {
        label: "Ready",
        bg: "oklch(0.72 0.16 142 / 15%)",
        border: "oklch(0.72 0.16 142 / 30%)",
        text: "var(--success)",
      },
      billed: {
        label: "Billed",
        bg: "rgba(255,255,255,0.05)",
        border: "rgba(255,255,255,0.1)",
        text: "var(--muted-foreground)",
      },
    };
  const s = map[status];
  return (
    <span
      className="rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function ItemStatusPill({ status }: { status: OrderItem["status"] }) {
  const isReady = status === "ready";
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{
        background: isReady ? "oklch(0.72 0.16 142 / 15%)" : "oklch(0.80 0.14 85 / 15%)",
        borderColor: isReady ? "oklch(0.72 0.16 142 / 30%)" : "oklch(0.80 0.14 85 / 30%)",
        color: isReady ? "var(--success)" : "var(--warning)",
      }}
    >
      {isReady ? "Ready" : "Cooking"}
    </span>
  );
}

function MenuAvailabilityList({ menu }: { menu: MenuItem[] }) {
  const [query, setQuery] = useState("");
  async function toggleAvail(item: MenuItem) {
    await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
  }
  const q = query.trim().toLowerCase();
  const cats = Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category)]));

  return (
    <div className="space-y-4 rounded-2xl border border-border/40 bg-card p-5 shadow-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter menu stock..."
          className="h-9 w-full rounded-xl border border-border/60 bg-background pl-9 pr-3 text-xs text-foreground placeholder-muted-foreground/60 focus:border-counter focus:ring-1 focus:ring-counter outline-none transition"
        />
      </div>
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {cats.map((cat) => {
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

/* ============ ADMIN PANEL ============ */

function AdminPanel() {
  const sections = [
    {
      key: "floors",
      title: "Floors",
      icon: <Building2 className="h-4 w-4" />,
      render: () => <FloorManager />,
    },
    {
      key: "prices",
      title: "Price Editor",
      icon: <IndianRupee className="h-4 w-4" />,
      render: () => <PriceEditor />,
    },
    {
      key: "tables",
      title: "Table Layout",
      icon: <TableIcon className="h-4 w-4" />,
      render: () => <TableManager />,
    },
    {
      key: "menu",
      title: "Menu Items",
      icon: <UtensilsCrossed className="h-4 w-4" />,
      render: () => <MenuItemManager />,
    },
    {
      key: "history",
      title: "Sales Stats",
      icon: <History className="h-4 w-4" />,
      render: () => <SalesHistory />,
    },
  ] as const;

  const [active, setActive] = useState<(typeof sections)[number]["key"]>("floors");
  const current = sections.find((s) => s.key === active)!;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {sections.map((s) => {
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold uppercase tracking-wider border shadow-sm transition-all focus:outline-none ${
                isActive
                  ? "bg-counter text-counter-foreground border-transparent shadow-lg"
                  : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              {s.icon}
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-xl">
        <header className="border-b border-border/40 px-5 py-4 text-xs font-bold uppercase tracking-wider text-foreground bg-secondary/40 flex items-center gap-2">
          {current.icon}
          <span>{current.title} Management</span>
        </header>
        <div className="p-5">{current.render()}</div>
      </section>
    </main>
  );
}

/* ============ FLOOR MANAGER ============ */

function FloorManager() {
  const { data: floors } = useRealtimeQuery<Floor>(fetchFloors, ["floors"]);
  const { data: tables } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const [floorName, setFloorName] = useState("");
  const [floorCode, setFloorCode] = useState("");

  async function addFloor() {
    const name = floorName.trim();
    const code = floorCode.trim().toUpperCase();
    if (!name || !code) {
      toast.error("Enter both floor name and code");
      return;
    }
    const { error } = await supabase.from("floors").insert({ name, code });
    if (error) toast.error(error.message);
    else {
      toast.success(`Floor added: ${name} (${code})`);
      setFloorName("");
      setFloorCode("");
    }
  }

  async function removeFloor(f: Floor) {
    const hasTables = tables.some((t) => t.floor_id === f.id);
    if (hasTables) {
      toast.error(`Remove all tables from "${f.name}" before deleting the floor`);
      return;
    }
    const { error } = await supabase.from("floors").delete().eq("id", f.id);
    if (error) toast.error(error.message);
    else toast.success(`Removed floor: ${f.name}`);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addFloor();
        }}
        className="space-y-3 rounded-2xl border border-border/40 bg-secondary/15 p-4"
      >
        <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wide">
          Add a new floor to the hotel
        </p>
        <div className="flex gap-2">
          <input
            value={floorName}
            onChange={(e) => setFloorName(e.target.value)}
            placeholder="Floor name (e.g. 1st Floor)"
            className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter"
          />
          <input
            value={floorCode}
            onChange={(e) => setFloorCode(e.target.value.toUpperCase())}
            placeholder="Code (e.g. 1F)"
            className="h-10 w-24 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter text-center"
            maxLength={4}
          />
        </div>
        <button
          type="submit"
          className="btn-base w-full font-bold bg-counter text-counter-foreground hover:bg-counter/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Floor</span>
        </button>
      </form>

      <ul className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
        {floors.length === 0 && (
          <li className="rounded-xl border border-dashed border-border/40 px-3 py-8 text-center text-xs text-muted-foreground">
            No floors added yet. Add one above.
          </li>
        )}
        {floors.map((f) => {
          const count = tables.filter((t) => t.floor_id === f.id).length;
          return (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/15 px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-foreground">{f.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 mt-0.5">
                  Code:{" "}
                  <span className="text-counter font-extrabold">{f.code}</span>
                  {" · "}
                  {count} table{count !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                disabled={count > 0}
                onClick={() => removeFloor(f)}
                className="rounded-lg p-2 text-destructive hover:bg-destructive/10 disabled:opacity-25 transition active:scale-90"
                title={count > 0 ? "Remove all tables on this floor first" : "Delete floor"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============ PRICE EDITOR ============ */

function PriceEditor() {
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkCat, setBulkCat] = useState<string>("__all__");
  const [busy, setBusy] = useState(false);

  const cats = Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category)]));

  const q = search.trim().toLowerCase();
  const filtered = menu.filter((m) => {
    const matchesCat = bulkCat === "__all__" || m.category === bulkCat;
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  function startEdit(m: MenuItem) {
    setEditingId(m.id);
    setEditPrice(Number(m.price).toFixed(2));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPrice("");
  }

  async function savePrice(m: MenuItem) {
    const p = parseFloat(editPrice);
    if (isNaN(p) || p < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("menu_items").update({ price: p }).eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success(`${m.name} → ₹${p.toFixed(2)}`);
    setBusy(false);
    setEditingId(null);
  }

  async function applyBulk() {
    const pct = parseFloat(bulkPercent);
    if (isNaN(pct) || pct === 0) {
      toast.error("Enter a non-zero percentage (e.g. 10 or -5)");
      return;
    }
    const targets = menu.filter((m) => bulkCat === "__all__" || m.category === bulkCat);
    if (targets.length === 0) {
      toast.error("No items in selected category");
      return;
    }
    setBusy(true);
    let failed = 0;
    await Promise.all(
      targets.map(async (m) => {
        const newPrice = Math.max(0, Number(m.price) * (1 + pct / 100));
        const { error } = await supabase
          .from("menu_items")
          .update({ price: parseFloat(newPrice.toFixed(2)) })
          .eq("id", m.id);
        if (error) failed++;
      }),
    );
    setBusy(false);
    if (failed === 0)
      toast.success(
        `${pct > 0 ? "+" : ""}${pct}% applied to ${targets.length} item${targets.length !== 1 ? "s" : ""}`,
      );
    else toast.error(`${failed} update(s) failed`);
    setBulkPercent("");
  }

  return (
    <div className="space-y-6">
      {/* Bulk Adjustment Panel */}
      <div className="rounded-2xl border border-border/40 bg-secondary/15 p-4 space-y-3">
        <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wide">
          Bulk Price Adjustment
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={bulkCat}
            onChange={(e) => setBulkCat(e.target.value)}
            className="h-10 flex-1 min-w-[140px] rounded-xl border border-border/60 bg-background px-2.5 text-xs text-foreground outline-none focus:border-counter"
          >
            <option value="__all__">All Categories</option>
            {cats.map((c) => (
              <option key={c} value={c} className="bg-card">
                {c}
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="number"
              step="1"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
              placeholder="% (e.g. 10 or -5)"
              className="h-10 w-40 rounded-xl border border-border/60 bg-background px-3 pr-8 text-xs text-foreground outline-none focus:border-counter text-center"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              %
            </span>
          </div>
          <button
            onClick={applyBulk}
            disabled={busy || !bulkPercent}
            className="btn-base font-bold bg-counter text-counter-foreground hover:bg-counter/90 active:scale-95 py-1.5 px-4 text-xs disabled:opacity-40"
          >
            {parseFloat(bulkPercent || "0") >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>Apply to {bulkCat === "__all__" ? "All" : bulkCat}</span>
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Enter a positive % to raise prices, negative to lower (e.g. <span className="font-bold text-success">+10</span> or <span className="font-bold text-destructive">-5</span>)
        </p>
      </div>

      {/* Per-item Price List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Individual Prices ({filtered.length})
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter items..."
              className="h-8 w-44 rounded-lg border border-border/60 bg-background pl-8 pr-3 text-xs text-foreground placeholder-muted-foreground/60 focus:border-counter focus:ring-1 focus:ring-counter outline-none transition"
            />
          </div>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-border/40 px-3 py-6 text-center text-xs text-muted-foreground">
              No items match your search.
            </li>
          )}
          {filtered.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/10 px-4 py-2.5 gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{m.name}</p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  {m.category}
                </p>
              </div>

              {editingId === m.id ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ₹
                    </span>
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePrice(m);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-8 w-28 rounded-lg border border-counter bg-background pl-6 pr-2 text-xs font-bold text-foreground text-center outline-none ring-1 ring-counter"
                    />
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => savePrice(m)}
                    className="h-8 w-8 rounded-lg bg-success/15 border border-success/30 text-success hover:bg-success/25 transition flex items-center justify-center active:scale-90"
                    title="Save price"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="h-8 w-8 rounded-lg bg-secondary/50 border border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition flex items-center justify-center active:scale-90"
                    title="Cancel"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-counter tabular-nums">
                    ₹{Number(m.price).toFixed(2)}
                  </span>
                  <button
                    onClick={() => startEdit(m)}
                    className="h-8 w-8 rounded-lg border border-border/60 bg-background hover:bg-secondary hover:text-foreground text-muted-foreground transition flex items-center justify-center active:scale-90"
                    title="Edit price"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ============ TABLE MANAGER ============ */

function TableManager() {
  const { data: floors } = useRealtimeQuery<Floor>(fetchFloors, ["floors"]);
  const { data: sections } = useRealtimeQuery<FloorSection>(fetchFloorSections, ["floor_sections"]);
  const { data: tables } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);

  // Floor management inputs (inline)
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorCode, setNewFloorCode] = useState("");

  // Selected state
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [activeAC, setActiveAC] = useState<boolean | null>(null);

  // Auto-select first floor when floors load
  useEffect(() => {
    if (floors.length > 0 && !activeFloorId) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  // Handle setting active section when floor changes
  useEffect(() => {
    if (activeFloorId) {
      const activeSections = sections.filter((s) => s.floor_id === activeFloorId);
      if (activeSections.length > 0) {
        if (activeAC === null || !activeSections.some((s) => s.is_ac === activeAC)) {
          setActiveAC(activeSections[0].is_ac);
        }
      } else {
        setActiveAC(null);
      }
    } else {
      setActiveAC(null);
    }
  }, [activeFloorId, sections]);

  async function addFloor() {
    const name = newFloorName.trim();
    const code = newFloorCode.trim().toUpperCase();
    if (!name || !code) {
      toast.error("Enter both floor name and code");
      return;
    }
    const { error } = await supabase.from("floors").insert({ name, code });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Floor added: ${name} (${code})`);
      setNewFloorName("");
      setNewFloorCode("");
    }
  }

  async function removeFloor(f: Floor) {
    const hasTables = tables.some((t) => t.floor_id === f.id);
    const hasSections = sections.some((s) => s.floor_id === f.id);
    if (hasTables || hasSections) {
      toast.error(`Remove all sections and tables from "${f.name}" before deleting the floor`);
      return;
    }
    const { error } = await supabase.from("floors").delete().eq("id", f.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Removed floor: ${f.name}`);
      if (activeFloorId === f.id) {
        setActiveFloorId(floors.find((x) => x.id !== f.id)?.id ?? null);
      }
    }
  }

  async function addSection(floorId: string, isAC: boolean) {
    const { error } = await supabase.from("floor_sections").insert({ floor_id: floorId, is_ac: isAC });
    if (error) {
      toast.error(error.message);
    } else {
      const floorName = floors.find((f) => f.id === floorId)?.name ?? "Floor";
      toast.success(`Enabled ${isAC ? "AC" : "Non-AC"} section on ${floorName}`);
      setActiveAC(isAC);
    }
  }

  async function removeSection(floorId: string, isAC: boolean) {
    const sectionTables = tables.filter((t) => t.floor_id === floorId && t.is_ac === isAC);
    const hasActiveOrders = sectionTables.some((t) =>
      orders.some((o) => o.table_id === t.id && o.status !== "billed")
    );

    if (hasActiveOrders) {
      toast.error("Cannot remove section: some tables have active tickets");
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to remove the ${isAC ? "AC" : "Non-AC"} section? This will delete all tables inside this section.`
    );
    if (!confirm) return;

    if (sectionTables.length > 0) {
      const { error: errTables } = await supabase
        .from("tables")
        .delete()
        .eq("floor_id", floorId)
        .eq("is_ac", isAC);
      if (errTables) {
        toast.error(`Error deleting tables: ${errTables.message}`);
        return;
      }
    }

    const { error: errSec } = await supabase
      .from("floor_sections")
      .delete()
      .eq("floor_id", floorId)
      .eq("is_ac", isAC);

    if (errSec) {
      toast.error(errSec.message);
    } else {
      toast.success("Section removed");
      if (activeAC === isAC && activeFloorId === floorId) {
        setActiveAC(null);
      }
    }
  }

  async function addTable() {
    if (!activeFloorId || activeAC === null) {
      toast.error("Select a floor and active section first");
      return;
    }
    const sectionTables = tables.filter(
      (t) => t.floor_id === activeFloorId && t.is_ac === activeAC
    );
    const next = (sectionTables.reduce((m, t) => Math.max(m, t.table_number), 0) || 0) + 1;
    const { error } = await supabase.from("tables").insert({
      table_number: next,
      status: "free",
      floor_id: activeFloorId,
      is_ac: activeAC,
    });
    if (error) {
      toast.error(error.message);
    } else {
      const floor = floors.find((f) => f.id === activeFloorId);
      toast.success(
        `Added Table ${next}T → ${floor?.code ?? "?"}/${activeAC ? "AC" : "Non-AC"}`
      );
    }
  }

  async function removeTable(t: TableRow) {
    const hasActive = orders.some((o) => o.table_id === t.id && o.status !== "billed");
    if (hasActive) {
      toast.error(`Table ${t.table_number}T has an active ticket — settle bill first`);
      return;
    }
    const { error } = await supabase.from("tables").delete().eq("id", t.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Removed Table ${t.table_number}T`);
    }
  }

  const selectedFloor = floors.find((f) => f.id === activeFloorId) ?? null;
  const activeFloorSections = sections.filter((s) => s.floor_id === activeFloorId);
  const activeSectionTables = tables.filter(
    (t) => t.floor_id === activeFloorId && t.is_ac === activeAC
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
      {/* Floor and Section Configuration (Left) */}
      <div className="space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFloor();
          }}
          className="space-y-3 rounded-2xl border border-border/40 bg-secondary/15 p-4"
        >
          <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wide">
            Add a new floor
          </p>
          <div className="flex gap-2">
            <input
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              placeholder="Floor name (e.g. 1st Floor)"
              className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter"
            />
            <input
              value={newFloorCode}
              onChange={(e) => setNewFloorCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. 1F)"
              className="h-10 w-20 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter text-center"
              maxLength={4}
            />
          </div>
          <button
            type="submit"
            className="btn-base w-full py-1.5 text-xs font-bold bg-counter text-counter-foreground hover:bg-counter/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Floor</span>
          </button>
        </form>

        {/* Floors List */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Floors ({floors.length})
          </p>
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {floors.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/40 rounded-xl">
                No floors added yet.
              </p>
            )}
            {floors.map((floor) => {
              const isSelected = floor.id === activeFloorId;
              const hasAC = sections.some((s) => s.floor_id === floor.id && s.is_ac);
              const hasNonAC = sections.some((s) => s.floor_id === floor.id && !s.is_ac);
              const floorTablesCount = tables.filter((t) => t.floor_id === floor.id).length;

              return (
                <div
                  key={floor.id}
                  onClick={() => setActiveFloorId(floor.id)}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-card border-counter shadow-md ring-1 ring-counter"
                      : "bg-card/50 border-border/40 hover:bg-secondary/15"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground/60" />
                        <h4 className="font-bold text-sm text-foreground">{floor.name}</h4>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-black uppercase text-muted-foreground">
                          {floor.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {floorTablesCount} table{floorTablesCount !== 1 ? "s" : ""} configured
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFloor(floor);
                      }}
                      disabled={floorTablesCount > 0}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10 disabled:opacity-20 transition"
                      title={floorTablesCount > 0 ? "Remove all tables first" : "Delete Floor"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Section Toggles */}
                  {isSelected && (
                    <div className="mt-4 border-t border-border/20 pt-3 flex flex-wrap gap-2">
                      {/* AC Button/State */}
                      {hasAC ? (
                        <div className="flex items-center overflow-hidden rounded-xl border border-success/30 bg-success/5 pl-2.5 pr-1 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAC(true);
                            }}
                            className={`text-[10px] font-bold uppercase tracking-wider transition mr-2 ${
                              activeAC === true ? "text-success font-extrabold" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            AC Room
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(floor.id, true);
                            }}
                            className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition"
                            title="Disable AC Section"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addSection(floor.id, true);
                          }}
                          className="rounded-xl border border-dashed border-border/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/40 transition"
                        >
                          + AC Room
                        </button>
                      )}

                      {/* Non-AC Button/State */}
                      {hasNonAC ? (
                        <div className="flex items-center overflow-hidden rounded-xl border border-success/30 bg-success/5 pl-2.5 pr-1 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAC(false);
                            }}
                            className={`text-[10px] font-bold uppercase tracking-wider transition mr-2 ${
                              activeAC === false ? "text-success font-extrabold" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Non-AC Room
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(floor.id, false);
                            }}
                            className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition"
                            title="Disable Non-AC Section"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addSection(floor.id, false);
                          }}
                          className="rounded-xl border border-dashed border-border/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/40 transition"
                        >
                          + Non-AC Room
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seating Table Setup (Right) */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        {selectedFloor && activeAC !== null ? (
          <>
            <div className="flex flex-wrap items-center justify-between border-b border-border/20 pb-3 gap-2">
              <div>
                <span className="badge border border-counter/20 bg-counter/10 text-counter mb-1">
                  {selectedFloor.code} / {activeAC ? "AC" : "Non-AC"}
                </span>
                <h3 className="font-extrabold text-base text-foreground">
                  Tables in {selectedFloor.name}
                </h3>
              </div>

              <button
                onClick={addTable}
                className="btn-base font-bold bg-counter text-counter-foreground hover:bg-counter/90 active:scale-95 py-1.5 px-4 text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Table</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeSectionTables.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-xl">
                  No tables configured in this section. Add one using the button above.
                </div>
              ) : (
                activeSectionTables.map((t) => {
                  const active = orders.some(
                    (o) => o.table_id === t.id && o.status !== "billed"
                  );
                  return (
                    <div
                      key={t.id}
                      className="group flex flex-col justify-between rounded-xl border border-border/30 bg-secondary/10 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                          {selectedFloor.code}/{activeAC ? "AC" : "Non-AC"}
                        </span>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: active ? "var(--warning)" : "var(--success)",
                          }}
                        />
                      </div>
                      <p className="mt-3 text-xl font-black text-foreground">
                        {t.table_number}T
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-2">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">
                          {active ? "Busy" : "Free"}
                        </span>
                        <button
                          disabled={active}
                          onClick={() => removeTable(t)}
                          className="rounded-lg p-1 text-destructive hover:bg-destructive/10 disabled:opacity-20 transition active:scale-90"
                          title={active ? "Table has active tickets" : "Remove table"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mb-3 text-muted-foreground/35" />
            <p className="text-xs font-semibold">
              Select a floor and open an enabled AC / Non-AC room on the left to configure tables.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const NEW_CATEGORY = "__new__";

function MenuItemManager() {
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const [manualCategories, setManualCategories] = useState<string[]>([]);
  const allCategories = Array.from(
    new Set([...CATEGORIES, ...menu.map((m) => m.category), ...manualCategories]),
  );
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState("");
  const [allowHalf, setAllowHalf] = useState(false);
  const [search, setSearch] = useState("");

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error("Enter a category name");
      return;
    }
    const existing = allCategories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!existing) setManualCategories((current) => [...current, trimmed]);
    setCategory(existing ?? trimmed);
    setNewCategory("");
    toast.success(`Category set: ${existing ?? trimmed}`);
  }

  async function addItem() {
    const p = Number(price);
    const finalCategory = category === NEW_CATEGORY ? newCategory.trim() : category;
    if (!name.trim() || isNaN(p) || p < 0 || !finalCategory) {
      toast.error("Invalid menu item entry details");
      return;
    }
    const { error } = await supabase.from("menu_items").insert({
      name: name.trim(),
      category: finalCategory,
      price: p,
      is_available: true,
      allow_half: allowHalf,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setPrice("");
    setNewCategory("");
    setAllowHalf(false);
    setCategory(finalCategory);
    toast.success(`Successfully added ${name}`);
  }

  async function removeItem(m: MenuItem) {
    const { error } = await supabase.from("menu_items").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success(`Removed ${m.name} from index`);
  }

  async function toggleAllowHalf(m: MenuItem) {
    await supabase.from("menu_items").update({ allow_half: !m.allow_half }).eq("id", m.id);
    toast.success(
      m.allow_half ? `${m.name} half portions disabled` : `${m.name} half portions enabled`,
    );
  }

  const activeCat = category === NEW_CATEGORY ? newCategory.trim() : category;
  const q = search.trim().toLowerCase();
  const filtered = menu.filter((m) => {
    const matchesCat = !activeCat || m.category.toLowerCase() === activeCat.toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        className="space-y-3 rounded-2xl border border-border/40 bg-secondary/15 p-4"
      >
        <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wide">
          Insert menu item details below
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Menu item name..."
          className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-2.5 text-xs text-foreground outline-none focus:border-counter"
          >
            {allCategories.map((c) => (
              <option key={c} value={c} className="bg-card">
                {c}
              </option>
            ))}
            <option value={NEW_CATEGORY} className="bg-card">
              + Create custom category...
            </option>
          </select>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="h-10 w-24 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter text-center"
          />
        </div>
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            id="allowHalf"
            checked={allowHalf}
            onChange={(e) => setAllowHalf(e.target.checked)}
            className="rounded border-border/60 text-counter focus:ring-counter bg-background"
          />
          <label
            htmlFor="allowHalf"
            className="text-xs font-semibold text-muted-foreground select-none"
          >
            Allow half plate / small portions
          </label>
        </div>
        {category === NEW_CATEGORY && (
          <div className="flex gap-2 animate-fade-up">
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="e.g. Refreshments, Platters"
              className="h-10 min-w-0 flex-1 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground outline-none focus:border-counter"
            />
            <button
              type="button"
              onClick={addCategory}
              className="btn-base font-bold bg-counter text-counter-foreground hover:bg-counter/90 active:scale-95 py-1 px-4 text-xs rounded-xl"
            >
              Add
            </button>
          </div>
        )}
        <button
          type="submit"
          className="btn-base w-full font-bold bg-counter text-counter-foreground hover:bg-counter/90 active:scale-[0.98] mt-2"
        >
          <Plus className="h-4 w-4" />
          <span>Register Menu Item</span>
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            {activeCat
              ? `Index: "${activeCat}" (${filtered.length})`
              : `Full Index (${menu.length})`}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter list..."
              className="h-8 w-44 rounded-lg border border-border/60 bg-background pl-8 pr-3 text-xs text-foreground placeholder-muted-foreground/60 focus:border-counter focus:ring-1 focus:ring-counter outline-none transition"
            />
          </div>
        </div>

        <ul className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-border/40 px-3 py-6 text-center text-xs text-muted-foreground">
              No items matching search conditions.
            </li>
          )}
          {filtered.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/10 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="truncate text-xs font-bold text-foreground">{m.name}</p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  {m.category} ·{" "}
                  <span className="text-counter font-bold">₹{Number(m.price).toFixed(2)}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleAllowHalf(m)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border transition ${
                    m.allow_half
                      ? "bg-success/15 border-success/30 text-success hover:bg-success/20"
                      : "bg-secondary/50 border-border/50 text-muted-foreground hover:bg-secondary"
                  }`}
                  title={m.allow_half ? "Portions: half enabled" : "Portions: half disabled"}
                >
                  ½ Portion
                </button>
                <button
                  onClick={() => removeItem(m)}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition active:scale-90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type Period = "today" | "week" | "month" | "year" | "lifetime";

function SalesHistory() {
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const [period, setPeriod] = useState<Period>("today");

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "1 Week" },
    { key: "month", label: "1 Month" },
    { key: "year", label: "1 Year" },
    { key: "lifetime", label: "Lifetime" },
  ];

  const since = (() => {
    const d = new Date();
    if (period === "today") {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === "week") {
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === "month") {
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    if (period === "year") {
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    return new Date(0);
  })();

  const billed = orders.filter((o) => o.status === "billed" && new Date(o.updated_at) >= since);
  const billedIds = new Set(billed.map((o) => o.id));
  const items = orderItems.filter((it) => billedIds.has(it.order_id));

  const stats = new Map<string, { name: string; qty: number; revenue: number }>();
  let total = 0;
  for (const it of items) {
    const m = menu.find((x) => x.id === it.menu_item_id);
    if (!m) continue;
    const rev = Number(m.price) * it.quantity;
    total += rev;
    const cur = stats.get(m.id) ?? { name: m.name, qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += rev;
    stats.set(m.id, cur);
  }
  const rows = Array.from(stats.values()).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5 border-b border-border/20 pb-3">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition focus:outline-none ${
              period === p.key
                ? "bg-counter text-counter-foreground shadow-sm"
                : "bg-secondary/40 border border-border/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-secondary/10 p-5 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
            Total Earnings
          </p>
          <p className="mt-1 text-3xl font-black text-counter">₹{total.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-secondary/10 p-5 shadow-inner">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
            Billed Transactions
          </p>
          <p className="mt-1 text-3xl font-black text-foreground">{billed.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-md">
        <div className="border-b border-border/30 bg-secondary/20 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
          Ranked Menu Performance
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No transaction data compiled in selected range.
          </div>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-border/20 overflow-y-auto">
            {rows.map((r) => (
              <li
                key={r.name}
                className="flex items-center justify-between px-4 py-3 text-xs font-semibold hover:bg-secondary/10 transition"
              >
                <span className="flex-1 truncate text-foreground">{r.name}</span>
                <span className="w-20 text-right text-muted-foreground font-bold">× {r.qty}</span>
                <span className="w-28 text-right text-foreground font-extrabold">
                  ₹{r.revenue.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
