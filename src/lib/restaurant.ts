import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TableRow = { id: string; table_number: number; status: "free" | "occupied" };
export type MenuItem = { id: string; name: string; category: string; price: number; is_available: boolean };
export type OrderStatus = "placed" | "in_kitchen" | "preparing" | "ready" | "billed";
export type Order = { id: string; table_id: string; status: OrderStatus; created_at: string; updated_at: string };
export type OrderItem = { id: string; order_id: string; menu_item_id: string; quantity: number };

export const CATEGORIES = ["Starters", "Main Course", "Beverages", "Desserts"] as const;

export function useRealtimeQuery<T>(
  fetcher: () => Promise<T[]>,
  tables: string[],
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await fetcher();
    setData(rows);
    setLoading(false);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
    const channel = supabase.channel(`rt-${tables.join("-")}-${Math.random()}`);
    tables.forEach((t) =>
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, () => refresh()),
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, tables.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refresh };
}

export async function fetchTables(): Promise<TableRow[]> {
  const { data } = await supabase.from("tables").select("*").order("table_number");
  return (data ?? []) as TableRow[];
}
export async function fetchMenu(): Promise<MenuItem[]> {
  const { data } = await supabase.from("menu_items").select("*").order("category").order("name");
  return (data ?? []) as MenuItem[];
}
export async function fetchOrders(): Promise<Order[]> {
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Order[];
}
export async function fetchOrderItems(): Promise<OrderItem[]> {
  const { data } = await supabase.from("order_items").select("*");
  return (data ?? []) as OrderItem[];
}
