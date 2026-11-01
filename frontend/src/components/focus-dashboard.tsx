"use client";

import { ArrowLeft, Flame, Timer } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { getDailyFocusSummary } from "@/lib/api";
import type { DailyFocusSummary } from "@/types/focus";

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function FocusDashboard() {
  const [summary, setSummary] = useState<DailyFocusSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = localDateString(new Date());

  useEffect(() => {
    getDailyFocusSummary(today, 7).then(setSummary).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Orbit could not load focus insights."));
  }, [today]);

  const week = useMemo(() => {
    const byDate = new Map(summary.map((day) => [day.focused_on, day]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = localDateString(date);
      return { key, label: date.toLocaleDateString(undefined, { weekday: "narrow" }), ...(byDate.get(key) ?? { focused_minutes: 0, completed_pomodoros: 0 }) };
    });
  }, [summary]);
  const focusedMinutes = week.reduce((total, day) => total + day.focused_minutes, 0);
  const completedPomodoros = week.reduce((total, day) => total + day.completed_pomodoros, 0);
  const todaySummary = week.at(-1);
  const peak = Math.max(...week.map((day) => day.focused_minutes), 1);

  return <main className="min-h-screen bg-[#040604] px-4 py-6 text-[#effaf1] sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-[#c5d2c9] hover:border-[#46ff96]/50"><ArrowLeft size={16} /> Calendar</Link><header className="mt-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dffbb]">Focus insights</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em] text-white">Your attention, visible.</h1><p className="mt-3 max-w-xl leading-7 text-[#94a399]">Completed work cycles from Focus Room become your daily focus history.</p></header>{error ? <p className="mt-10 rounded-2xl border border-[#ff5151]/30 bg-[#ff5151]/10 p-4 text-[#ffaaaa]">{error}</p> : <><section className="mt-8 grid gap-4 sm:grid-cols-3"><Metric icon={<Timer size={19} />} label="Focused today" value={`${todaySummary?.focused_minutes ?? 0} min`} /><Metric icon={<Flame size={19} />} label="Pomodoros today" value={String(todaySummary?.completed_pomodoros ?? 0)} /><Metric icon={<Flame size={19} />} label="Focused this week" value={`${focusedMinutes} min`} /></section><section className="mt-5 rounded-[2rem] border border-white/10 bg-[#080b08] p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Seven-day rhythm</h2><p className="mt-1 text-sm text-[#8e9d93]">{completedPomodoros} completed Pomodoros this week</p></div><span className="rounded-full bg-[#46ff96]/10 px-3 py-1 text-xs font-bold text-[#8dffbb]">minutes</span></div><div className="mt-10 flex h-52 items-end justify-between gap-3">{week.map((day) => <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-3"><span className="text-xs text-[#b9c8be]">{day.focused_minutes || ""}</span><div className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-[#237a49] to-[#46ff96] transition-all" style={{ height: `${Math.max(day.focused_minutes ? (day.focused_minutes / peak) * 100 : 3, 3)}%` }} /><span className="text-xs font-bold text-[#819087]">{day.label}</span></div>)}</div></section></>}</div></main>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-[#080b08] p-5"><div className="flex items-center gap-2 text-[#46ff96]">{icon}<span className="text-xs font-bold uppercase tracking-[.15em] text-[#8e9d93]">{label}</span></div><p className="mt-4 text-3xl font-semibold text-white">{value}</p></div>;
}
