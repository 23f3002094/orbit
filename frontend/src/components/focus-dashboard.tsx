"use client";

import { CheckCircle2, Flame, Timer } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { getDailyFocusSummary, getFocusSessions, getTaskCompletion } from "@/lib/api";
import { OrbitNav } from "@/components/orbit-nav";
import { FocusRhythmHeatmap } from "@/components/focus-rhythm-heatmap";
import type { DailyFocusSummary, FocusSession, TaskCompletionSummary } from "@/types/focus";

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function FocusDashboard() {
  const [summary, setSummary] = useState<DailyFocusSummary[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [taskCompletion, setTaskCompletion] = useState<TaskCompletionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setToday(localDateString(new Date())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!today) return;
    const start = new Date();
    start.setDate(start.getDate() - 6);
    Promise.all([getDailyFocusSummary(today, 7), getFocusSessions(localDateString(start), today), getTaskCompletion(today)])
      .then(([daily, intervals, completion]) => {
        setSummary(daily);
        setSessions(intervals);
        setTaskCompletion(completion);
      })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Orbit could not load Momentum."));
  }, [today]);

  const week = useMemo(() => {
    if (!today) return [];
    const byDate = new Map(summary.map((day) => [day.focused_on, day]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = localDateString(date);
      return { key, label: date.toLocaleDateString(undefined, { weekday: "narrow" }), ...(byDate.get(key) ?? { focused_minutes: 0, completed_pomodoros: 0 }) };
    });
  }, [summary, today]);

  const focusedMinutes = week.reduce((total, day) => total + day.focused_minutes, 0);
  const completedPomodoros = week.reduce((total, day) => total + day.completed_pomodoros, 0);
  const todaySummary = week.at(-1);
  const todayRate = taskCompletion?.today_total ? Math.round((taskCompletion.today_completed / taskCompletion.today_total) * 100) : 0;
  const weekRate = taskCompletion?.week_total ? Math.round((taskCompletion.week_completed / taskCompletion.week_total) * 100) : 0;

  function hourHasFocus(day: string, hour: number): boolean {
    return sessions.some((session) => {
      if (session.focused_on !== day) return false;
      const endedAt = new Date(session.completed_at);
      const startedAt = new Date(endedAt.getTime() - session.duration_seconds * 1_000);
      const hourStart = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60_000);
      return startedAt < hourEnd && endedAt > hourStart;
    });
  }

  return (
    <main className="min-h-screen bg-[#040604] px-4 py-6 text-[#effaf1] sm:px-8">
      <OrbitNav className="fixed left-5 top-24 z-20 hidden w-52 xl:block" />
      <div className="mx-auto max-w-5xl xl:ml-[17rem] xl:mr-8">
        <header><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dffbb]">Momentum</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em] text-white">Your attention, visible.</h1><p className="mt-3 max-w-xl leading-7 text-[#94a399]">Every focused minute and kept promise becomes part of your daily history.</p></header>
        {!today ? <p className="mt-10 text-[#8e9d93]">Loading your local focus timeline...</p> : error ? <p className="mt-10 rounded-2xl border border-[#ff5151]/30 bg-[#ff5151]/10 p-4 text-[#ffaaaa]">{error}</p> : <>
          <section className="mt-8 grid gap-4 sm:grid-cols-3"><Metric icon={<Timer size={19} />} label="Focused today" value={`${todaySummary?.focused_minutes ?? 0} min`} /><Metric icon={<Flame size={19} />} label="Pomodoros today" value={String(todaySummary?.completed_pomodoros ?? 0)} /><Metric icon={<Timer size={19} />} label="Focused this week" value={`${focusedMinutes} min`} /></section>
          <section className="mt-5 grid gap-4 md:grid-cols-3">
            <TaskMetric label="Promises kept today" completed={taskCompletion?.today_completed ?? 0} total={taskCompletion?.today_total ?? 0} rate={todayRate} />
            <TaskMetric label="Promises kept this week" completed={taskCompletion?.week_completed ?? 0} total={taskCompletion?.week_total ?? 0} rate={weekRate} />
            <div className="rounded-3xl border border-white/10 bg-[#080b08] p-5"><div className="flex items-center gap-2 text-[#46ff96]"><Flame size={19} /><span className="text-xs font-bold uppercase tracking-[.15em] text-[#8e9d93]">Weekly rhythm</span></div><p className="mt-4 text-3xl font-semibold text-white">{completedPomodoros}</p><p className="mt-1 text-sm text-[#8e9d93]">completed Pomodoros</p></div>
          </section>
          <section className="mt-5 rounded-[2rem] border border-white/10 bg-[#080b08] p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">24/7-hour focus map</h2><p className="mt-1 text-sm text-[#8e9d93]">Each orange block is an hour touched by any recorded focus time.</p></div><span className="text-xs text-[#819087]">00:00 - 24:00</span></div><div className="mt-6 overflow-x-auto"><div className="min-w-[720px]"><div className="ml-16 grid text-[10px] text-[#6f7e74]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>{Array.from({ length: 24 }, (_, hour) => <span key={hour}>{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span>)}</div><div className="mt-2 space-y-2">{week.map((day) => <div key={day.key} className="grid grid-cols-[3.5rem_1fr] items-center gap-2"><span className="text-xs font-bold text-[#9ba99f]">{day.label} <span className="font-normal text-[#627066]">{day.key.slice(8)}</span></span><div className="grid h-7 gap-px overflow-hidden rounded-md" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>{Array.from({ length: 24 }, (_, hour) => <span key={hour} title={`${day.key} ${String(hour).padStart(2, "0")}:00`} className={hourHasFocus(day.key, hour) ? "bg-[#ff9f43] shadow-[inset_0_0_10px_rgba(255,255,255,.35)]" : "bg-white/[.06]"} />)}</div></div>)}</div></div></div></section>
          <FocusRhythmHeatmap endDate={today} />
        </>}
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-[#080b08] p-5"><div className="flex items-center gap-2 text-[#46ff96]">{icon}<span className="text-xs font-bold uppercase tracking-[.15em] text-[#8e9d93]">{label}</span></div><p className="mt-4 text-3xl font-semibold text-white">{value}</p></div>;
}

function TaskMetric({ label, completed, total, rate }: { label: string; completed: number; total: number; rate: number }) {
  return <div className="rounded-3xl border border-white/10 bg-[#080b08] p-5"><div className="flex items-center gap-2 text-[#46ff96]"><CheckCircle2 size={19} /><span className="text-xs font-bold uppercase tracking-[.15em] text-[#8e9d93]">{label}</span></div><div className="mt-4 flex items-end justify-between"><p className="text-3xl font-semibold text-white">{completed}<span className="text-lg text-[#819087]"> / {total}</span></p><span className="text-sm font-bold text-[#8dffbb]">{rate}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#46ff96] transition-all" style={{ width: `${rate}%` }} /></div></div>;
}
