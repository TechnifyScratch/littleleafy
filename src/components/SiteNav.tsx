import Link from "next/link";
import { Flower2 } from "lucide-react";

const makerWorldUrl = "#";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms and Conditions" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav() {
  return (
    <div className="grid gap-3">
      <a
        className="press-button block rounded-full bg-lilac-500 px-4 py-2 text-center text-sm font-black text-white shadow-press transition hover:brightness-105"
        href={makerWorldUrl}
      >
        Support Us on MakerWorld
      </a>

      <nav className="flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/88 px-4 py-3 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
        <Link className="flex items-center gap-3" href="/">
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-leaf-100 text-leaf-700 shadow-inner">
            <Flower2 className="h-6 w-6" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-lilac-300" />
          </span>
          <span>
            <span className="block text-lg font-black leading-none text-stone-950">LittleLeafy</span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-leaf-700">
              Browser planter studio
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              className="rounded-full px-3 py-2 text-sm font-black text-stone-600 transition hover:bg-leaf-50 hover:text-leaf-700"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
