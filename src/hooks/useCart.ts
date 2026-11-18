"use client";
import { useSyncExternalStore } from "react";
import type { CartItem } from "@/types/catalog";

// Keranjang disimpan di browser. Harga di sini hanya untuk tampilan; server akan menghitung ulang saat checkout.
const KEY = "ghopyeong-cart";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { cache = []; }
  return cache!;
}
function write(items: CartItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
    add(item: CartItem) {
      const cur = read();
      const hit = cur.find((i) => i.key === item.key);
      write(hit ? cur.map((i) => (i.key === item.key ? { ...i, qty: i.qty + item.qty } : i)) : [...cur, item]);
    },
    setQty(key: string, qty: number) {
      write(qty <= 0 ? read().filter((i) => i.key !== key) : read().map((i) => (i.key === key ? { ...i, qty } : i)));
    },
    clear() { write([]); },
  };
}
