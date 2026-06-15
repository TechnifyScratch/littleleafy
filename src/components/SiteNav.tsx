import Link from "next/link";
import { ChevronDown, Heart } from "lucide-react";

const toolLinks = [
  { href: "/tools/labels", label: "Plant labels" },
  { href: "/tools/spacing", label: "Spacing planner" },
  { href: "/tools/soil", label: "Soil mix helper" },
];

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms and Conditions" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav() {
  return (
    <div className="relative z-[100] grid gap-3">
      <nav className="relative z-[100] flex overflow-visible flex-col gap-3 rounded-3xl border border-white/80 bg-white/88 px-4 py-3 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
        <Link className="flex items-center gap-3" href="/">
          <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-50 shadow-inner">
            <img
              alt="LittleLeafy logo"
              className="h-12 w-12 object-contain"
              src="/littleleafy-logo.png"
            />
          </span>
          <span>
            <span className="block text-lg font-black leading-none text-stone-950">LittleLeafy</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <details className="group relative z-[999]">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full px-3 py-2 text-sm font-black text-stone-600 transition hover:bg-leaf-50 hover:text-leaf-700 [&::-webkit-details-marker]:hidden">
              Garden Tools
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-full z-[9999] mt-2 grid min-w-56 gap-1 rounded-2xl border border-leaf-100 bg-white p-2 shadow-soft md:left-auto md:right-0">
              {toolLinks.map((link) => (
                <Link
                  key={link.href}
                  className="rounded-xl px-3 py-2 text-sm font-black text-stone-600 transition hover:bg-leaf-50 hover:text-leaf-700"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              className="rounded-full px-3 py-2 text-sm font-black text-stone-600 transition hover:bg-leaf-50 hover:text-leaf-700"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}

          <a
            className="support-button inline-flex items-center gap-2 rounded-full bg-lilac-500 px-4 py-2 text-sm font-black text-white shadow-press"
            href="https://store.heyrivo.com/donate"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Heart className="h-4 w-4 fill-none stroke-[2.5]" aria-hidden="true" />
            Support Us
          </a>
        </div>
      </nav>
    </div>
  );
}
