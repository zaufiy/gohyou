import { supabase } from "./supabase";
import type { Product } from "@/types/catalog";

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products").select("*, option_groups(*, option_items(*))").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type SlotInfo = { id: string; pickup_date: string; remaining: number };
export async function getPreorderSlots(): Promise<SlotInfo[]> {
  const { data, error } = await supabase
    .from("preorder_slots").select("id, pickup_date, capacity, reserved, sales_sessions!inner(is_active)")
    .eq("sales_sessions.is_active", true).order("pickup_date");
  if (error) throw new Error(error.message);
  return (data ?? []).map((s: any) => ({ id: s.id, pickup_date: s.pickup_date, remaining: s.capacity - s.reserved }));
}
