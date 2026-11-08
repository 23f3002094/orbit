"use client";

import { useEffect, useMemo, useState } from "react";

import { getDailyFocusSummary } from "@/lib/api";
import type { DailyFocusSummary } from "@/types/focus";

type HeatmapRange = "month" | "year";

function parseDay(day: string): Date {
  return new Date(day + "T12:00:00");
}

function dateKey(date: Date): string {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function previousDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function levelFor(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 25) return 1;
  if (minutes < 50) return 2;
  if (minutes < 90) return 3;
  return 4;
}

export function FocusRhythmHeatmap({ endDate }: { endDate: string }) {
  const [range, setRange] = useState<HeatmapRange>("year");
  const [summary, setSummary] = useState<DailyFocusSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const period = useMemo(() => {
    const end = parseDay(endDate);
    if (range === "year") return { start: previousDays(end, 364), days: 365, label: "last 365 days" };
    const start = new Date(end.getFullYear(), end.getMonth(), 1, 12);
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return { start, days, label: "this month" };
  }, [endDate, range]);

  useEffect(() => {
    let active = true;
    getDailyFocusSummary(endDate, period.days).then((items) => {
      if (active) setSummary(items);
    }).catch(() => {
      if (active) setSummary([]);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [endDate, period.days]);

  const { weeks, byDate, monthLabels } = useMemo(() => {
    const end = parseDay(endDate);
    const byDate = new Map(summary.map((day) => [day.focused_on, day]));
    const gridStart = previousDays(period.start, period.start.getDay());
    const totalDays = Math.floor((end.getTime() - gridStart.getTime()) / 86_400_000) + 1;
    const weeks = Array.from({ length: Math.ceil(totalDays / 7) }, (_, week) => Array.from({ length: 7 }, (_, weekday) => {
      const date = previousDays(gridStart, -(week * 7 + weekday));
      const key = dateKey(date);
      return date < period.start || date > end ? null : { key, date, summary: byDate.get(key) };
    }));
    const monthLabels = weeks.map((week) => {
      const first = week.find(Boolean);
      return first && first.date.getDate() <= 7 ? first.date.toLocaleDateString(undefined, { month: "short" }) : "";
    });
    return { weeks, byDate, monthLabels };
  }, [endDate, period.start, summary]);

  const activeDays = Array.from(byDate.values()).filter((day) => day.focused_minutes > 0).length;

  return <section className="mt-5 rounded-[2rem] border border-white/10 bg-[#080b08] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#d1a5ff]">Focus rhythm</p><h2 className="mt-1 text-xl font-semibold text-white">Consistency, made visible.</h2><p className="mt-1 text-sm text-[#aeb0d0]">{activeDays} focused days in {period.label}.</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-1"><button onClick={() => setRange("month")} className={range === "month" ? "rounded-lg bg-[#a855f7] px-3 py-1.5 text-xs font-bold text-white" : "rounded-lg px-3 py-1.5 text-xs text-[#aeb0d0]"}>Month</button><button onClick={() => setRange("year")} className={range === "year" ? "rounded-lg bg-[#a855f7] px-3 py-1.5 text-xs font-bold text-white" : "rounded-lg px-3 py-1.5 text-xs text-[#aeb0d0]"}>Year</button></div></div><div className="mt-6 overflow-x-auto"><div className="min-w-max"><div className="ml-8 flex gap-1">{monthLabels.map((label, index) => <span key={index} className="w-3 text-[9px] font-bold text-[#817aa2]">{label}</span>)}</div><div className="mt-2 flex gap-2"><div className="grid grid-rows-7 gap-1 pt-0.5 text-[9px] font-bold text-[#817aa2]"><span></span><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span></div><div className="flex gap-1">{weeks.map((week, weekIndex) => <div key={weekIndex} className="grid grid-rows-7 gap-1">{week.map((day, weekday) => day ? <span key={day.key} title={day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + ": " + (day.summary?.focused_minutes ?? 0) + " focused min · " + (day.summary?.completed_pomodoros ?? 0) + " Pomodoros"} className={"focus-rhythm-cell focus-rhythm-" + levelFor(day.summary?.focused_minutes ?? 0)} aria-label={day.key + ": " + (day.summary?.focused_minutes ?? 0) + " focused minutes"} /> : <span key={"empty-" + weekday} className="size-3" />)}</div>)}</div></div></div></div><div className="mt-5 flex items-center justify-end gap-2 text-[10px] text-[#aeb0d0]"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className={"focus-rhythm-cell focus-rhythm-" + level} />)}<span>More</span></div>{isLoading && <p className="mt-3 text-xs text-[#aeb0d0]">Loading focus rhythm...</p>}</section>;
}
