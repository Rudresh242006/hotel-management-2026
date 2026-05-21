import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { ChefHat, CheckCircle2, Plus, Trash2, Settings, ClipboardList, DollarSign, Table as TableIcon, UtensilsCrossed, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoadingScreen } from "@/components/LoadingScreen";

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
        title="Counter Console"
        subtitle="Live orders & admin tools"
        right={
          <div className="flex gap-1 rounded-lg bg-white/15 p-1">
            <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} icon={<ClipboardList className="h-4 w-4" />}>
              Orders
            </TabBtn>
            <TabBtn active={tab === "admin"} onClick={() => setTab("admin")} icon={<Settings className="h-4 w-4" />}>
              Admin Panel
            </TabBtn>
          </div>
        }
      />
      {tab === "orders" ? <OrdersView /> : <AdminPanel />}
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
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
        active ? "bg-white text-foreground" : "text-white/90 hover:bg-white/10"
      }`}
    >
      {icon} {children}
    </button>
  );
}

/* ============ ORDERS VIEW ============ */

function OrdersView() {
  const { data: tables, loading: lt } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: menu, loading: lm } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const { data: orders, loading: lo } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);
  const { data: orderItems, loading: loi } = useRealtimeQuery<OrderItem>(fetchOrderItems, ["order_items"]);
  const initialLoading = lt && lm && lo && loi;

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

  const [search, setSearch] = useState("");
  const active = orders.filter((o) => o.status !== "billed");
  const filteredOrders = active.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const table = tables.find((t) => t.id === o.table_id);
    if (table?.table_number.toString().includes(q)) return true;
    const items = orderItems.filter((oi) => oi.order_id === o.id);
    return items.some((it) => {
      const m = menu.find((x) => x.id === it.menu_item_id);
      return m?.name.toLowerCase().includes(q);
    });
  });

  async function forwardToKitchen(id: string) {
    await supabase.from("orders").update({ status: "in_kitchen" }).eq("id", id);
    toast.success("Forwarded to kitchen");
  }

  async function toggleAvail(item: MenuItem) {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
  }

  if (initialLoading) return <LoadingScreen role="counter" label="Loading orders…" />;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.4fr_1fr]">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Incoming orders ({filteredOrders.length})
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table or item…"
              className="h-8 w-44 rounded-md border bg-background pl-8 pr-3 text-sm"
            />
          </div>
        </div>
        <div className="space-y-3">
          {filteredOrders.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              {search.trim() ? "No orders match your search." : "No active orders. Waiting…"}
            </div>
          )}
          {filteredOrders.map((o) => {
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
                      <li key={it.id} className="flex items-center justify-between gap-2">
                        <span className="flex-1">{it.quantity} × {m?.name ?? "?"}</span>
                        <ItemStatusPill status={it.status} />
                        <span className="w-16 text-right text-muted-foreground">
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
                    <span
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
                      style={{
                        color: "var(--success-foreground)",
                        background: "color-mix(in oklab, var(--success) 25%, transparent)",
                      }}
                    >
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Menu availability
          </h2>
        </div>
        <MenuAvailabilityList menu={menu} />
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; bg: string }> = {
    placed: { label: "New", bg: "var(--warning)" },
    in_kitchen: { label: "Preparing", bg: "var(--warning)" },
    preparing: { label: "Preparing", bg: "var(--warning)" },
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

function ItemStatusPill({ status }: { status: OrderItem["status"] }) {
  const isReady = status === "ready";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: isReady ? "var(--success)" : "var(--warning)",
        color: "white",
      }}
    >
      {isReady ? "Ready" : "Preparing"}
    </span>
  );
}


function MenuAvailabilityList({ menu }: { menu: MenuItem[] }) {
  const [query, setQuery] = useState("");
  async function toggleAvail(item: MenuItem) {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
  }
  const q = query.trim().toLowerCase();
  const cats = Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category)]));
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search item or category…"
          className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-sm"
        />
        {q && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {menu.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)).length}
          </span>
        )}
      </div>
      {cats.map((cat) => {
        const items = menu.filter((m) => m.category === cat && (!q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)));
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
  );
}

/* ============ ADMIN PANEL ============ */

function AdminPanel() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Accordion type="single" collapsible defaultValue="prices" className="space-y-3">
        <AdminAccordionItem value="prices" title="Menu Price Editor" icon={<DollarSign className="h-4 w-4" />}>
          <PriceEditor />
        </AdminAccordionItem>
        <AdminAccordionItem value="tables" title="Table Manager" icon={<TableIcon className="h-4 w-4" />}>
          <TableManager />
        </AdminAccordionItem>
        <AdminAccordionItem value="menu" title="Menu Item Manager" icon={<UtensilsCrossed className="h-4 w-4" />}>
          <MenuItemManager />
        </AdminAccordionItem>
      </Accordion>
    </main>
  );
}

function AdminAccordionItem({
  value,
  title,
  icon,
  children,
}: {
  value: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <AccordionTrigger
        className="px-4 py-3 text-sm font-bold uppercase tracking-wider hover:no-underline"
        style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
      >
        <span className="flex items-center gap-2">{icon} {title}</span>
      </AccordionTrigger>
      <AccordionContent className="p-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header
        className="rounded-t-xl px-4 py-3 text-sm font-bold uppercase tracking-wider"
        style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
      >
        {title}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}


function PriceEditor() {
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  async function savePrice(item: MenuItem) {
    const raw = edits[item.id];
    if (raw === undefined) return;
    const price = Number(raw);
    if (isNaN(price) || price < 0) {
      toast.error("Invalid price");
      return;
    }
    await supabase.from("menu_items").update({ price }).eq("id", item.id);
    setEdits((e) => {
      const n = { ...e };
      delete n[item.id];
      return n;
    });
    toast.success(`Updated ${item.name}`);
  }

  const allCategories = Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category)]));
  const q = search.trim().toLowerCase();

  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item…"
          className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-sm"
        />
        {q && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {menu.filter((m) => m.name.toLowerCase().includes(q)).length}
          </span>
        )}
      </div>
      {allCategories.map((cat) => {
        const items = menu.filter((m) => m.category === cat && (!q || m.name.toLowerCase().includes(q)));
        if (!items.length) return null;
        return (
          <div key={cat}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
            <ul className="space-y-2">
              {items.map((m) => {
                const dirty = edits[m.id] !== undefined;
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={dirty ? edits[m.id] : Number(m.price).toFixed(2)}
                      onChange={(e) => setEdits((s) => ({ ...s, [m.id]: e.target.value }))}
                      className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      disabled={!dirty}
                      onClick={() => savePrice(m)}
                      className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-30"
                      style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
                    >
                      Save
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TableManager() {
  const { data: tables } = useRealtimeQuery<TableRow>(fetchTables, ["tables"]);
  const { data: orders } = useRealtimeQuery<Order>(fetchOrders, ["orders"]);

  async function addTable() {
    const next = (tables.reduce((m, t) => Math.max(m, t.table_number), 0) || 0) + 1;
    const { error } = await supabase.from("tables").insert({ table_number: next, status: "free" });
    if (error) toast.error(error.message);
    else toast.success(`Added Table ${next}`);
  }

  async function removeTable(t: TableRow) {
    const hasActive = orders.some((o) => o.table_id === t.id && o.status !== "billed");
    if (hasActive) {
      toast.error(`Table ${t.table_number} has an active order`);
      return;
    }
    const { error } = await supabase.from("tables").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success(`Removed Table ${t.table_number}`);
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={addTable}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold"
          style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
        >
          <Plus className="h-4 w-4" /> Add Table
        </button>
      </div>
      <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
        {tables.map((t) => {
          const active = orders.some((o) => o.table_id === t.id && o.status !== "billed");
          return (
            <li key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-semibold">Table {t.table_number}</p>
                <p className="text-xs text-muted-foreground">
                  {t.status} {active && "· active order"}
                </p>
              </div>
              <button
                disabled={active}
                onClick={() => removeTable(t)}
                className="rounded-md p-2 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                title={active ? "Has active order" : "Remove"}
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

const NEW_CATEGORY = "__new__";

function MenuItemManager() {
  const { data: menu } = useRealtimeQuery<MenuItem>(fetchMenu, ["menu_items"]);
  const [manualCategories, setManualCategories] = useState<string[]>([]);
  const allCategories = Array.from(new Set([...CATEGORIES, ...menu.map((m) => m.category), ...manualCategories]));
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState("");
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
    toast.success(`Category selected: ${existing ?? trimmed}`);
  }

  async function addItem() {
    const p = Number(price);
    const finalCategory = category === NEW_CATEGORY ? newCategory.trim() : category;
    if (!name.trim() || isNaN(p) || p < 0 || !finalCategory) {
      toast.error("Enter valid name, category, and price");
      return;
    }
    const { error } = await supabase
      .from("menu_items")
      .insert({ name: name.trim(), category: finalCategory, price: p, is_available: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setPrice("");
    setNewCategory("");
    setCategory(finalCategory);
    toast.success(`Added ${name}`);
  }

  async function removeItem(m: MenuItem) {
    const { error } = await supabase.from("menu_items").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success(`Removed ${m.name}`);
  }

  const activeCat = category === NEW_CATEGORY ? newCategory.trim() : category;
  const q = search.trim().toLowerCase();
  const filtered = menu.filter((m) => {
    const matchesCat = !activeCat || m.category.toLowerCase() === activeCat.toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
        className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3"
      >
        <p className="text-xs text-muted-foreground">
          Tip: choose "Add new category", type the category, then press Enter or Add Category. After that, add items under it.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value={NEW_CATEGORY}>+ Add new category…</option>
          </select>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="w-24 rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        {category === NEW_CATEGORY && (
          <div className="flex gap-2">
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
              placeholder="New category name (e.g. Salads, Soups)"
              className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={addCategory}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold"
              style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
            >
              Add Category
            </button>
          </div>
        )}
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold"
          style={{ background: "var(--counter)", color: "var(--counter-foreground)" }}
        >
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </form>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {activeCat ? `Items in "${activeCat}" (${filtered.length})` : `All items (${menu.length})`}
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item…"
            className="h-8 w-40 rounded-md border bg-background pl-8 pr-3 text-sm"
          />
          {q && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {filtered.length}
            </span>
          )}
        </div>
      </div>
      <ul className="max-h-[45vh] space-y-1 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            No items match your search.
          </li>
        )}
        {filtered.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.category} · ${Number(m.price).toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => removeItem(m)}
              className="rounded-md p-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
