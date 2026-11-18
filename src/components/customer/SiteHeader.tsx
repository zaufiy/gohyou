"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useCart } from "@/hooks/useCart";
import { SITE } from "@/config/site";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/menu", label: "Menu" },
  { href: "/antrean", label: "Antrean" },
];

export function SiteHeader() {
  const path = usePathname();
  const { count } = useCart();

  if (path.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-steam bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-extrabold"
        >
          <Image
            src="/images/logo-gohyong.jpeg"
            alt="Logo GOHYOU"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-contain"
            priority
          />
          {SITE.name}
        </Link>

        {/* Navigasi */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "rounded-pill px-3 py-1.5 text-sm font-semibold",
                path === l.href
                  ? "bg-steam"
                  : "opacity-80 hover:opacity-100"
              )}
            >
              {l.label}
            </Link>
          ))}

          <Link
            href="/keranjang"
            className="ml-2 rounded-pill bg-soy px-4 py-1.5 text-sm font-semibold text-paper"
          >
            Keranjang{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}