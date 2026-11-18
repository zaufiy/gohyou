"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/hooks/useCart";

export function BottomNav() {
  const { count } = useCart();
  if (usePathname().startsWith("/admin")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex md:hidden border-t border-steam bg-paper">
      <Link href="/menu" className="flex min-h-14 flex-1 items-center justify-center font-semibold">Menu</Link>
      <Link href="/antrean" className="flex min-h-14 flex-1 items-center justify-center font-semibold">Antrean</Link>
      <Link href="/keranjang" className="flex min-h-14 flex-1 items-center justify-center gap-2 font-semibold">
        Keranjang
        {count > 0 && <span className="rounded-pill bg-chili px-2 text-xs text-white">{count}</span>}
      </Link>
    </nav>
  );
}
