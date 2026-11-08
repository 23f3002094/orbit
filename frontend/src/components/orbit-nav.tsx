"use client";

import { CalendarDays, Clock3, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface OrbitNavProps {
  className?: string;
}

const links = [
  { href: "/", label: "Calendar", icon: CalendarDays },
  { href: "/today", label: "Today", icon: Clock3 },
  { href: "/insights", label: "Momentum", icon: Target },
];

export function OrbitNav({ className = "" }: OrbitNavProps) {
  const pathname = usePathname();

  return <nav aria-label="Orbit navigation" className={["rounded-[1.75rem] border border-white/[0.08] bg-[#080b08] p-4", className].join(" ")}><p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#8c9a90]">Your orbit</p><div className="space-y-1">{links.map(({ href, label, icon: Icon }) => {
    const isActive = pathname === href;
    const linkClass = isActive ? "flex items-center gap-3 rounded-xl bg-[#46ff96]/10 px-3 py-3 text-sm font-semibold text-[#9cffc5]" : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#9fad9f] transition hover:bg-white/[.05] hover:text-white";
    return <Link key={href} href={href} className={linkClass}><Icon size={17} />{label}</Link>;
  })}</div></nav>;
}
