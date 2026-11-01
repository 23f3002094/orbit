"use client";

import { Check, CheckCircle2, Flame, GripVertical, Play, Target, Timer } from "lucide-react";
import Link from "next/link";
import { type DragEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { FocusSpace } from "@/components/focus-space";
import { getDailyFocusSummary, getTasks, updateTask, updateTaskCompletion } from "@/lib/api";
import type { Task, TaskPriority } from "@/types/task";

const priorityOrder: Record<TaskPriority, number> = { must_do: 0, should_do: 1, could_do: 2 };
const timelineHours = Array.from({ length: 17 }, (_, index) => index + 7);

function localDateString(date: Date): string {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function displayTime(time: string | null): string {
  if (!time) return "";
  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);
  return String(hour % 12 || 12) + ":" + minute + " " + (hour < 12 ? "AM" : "PM");
}

function hourLabel(hour: number): string {
  return String(hour % 12 || 12) + " " + (hour < 12 ? "AM" : "PM");
}

function endTimeFor(hour: number, minutes: number | null): string {
  const endMinutes = Math.min(hour * 60 + Math.max(minutes ?? 60, 30), 23 * 60 + 59);
  return String(Math.floor(endMinutes / 60)).padStart(2, "0") + ":" + String(endMinutes % 60).padStart(2, "0");
}

export function TodayWorkspace() {
  const [today, setToday] = useState<string | null>(null);
  const [todayLabel, setTodayLabel] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusedMinutes, setFocusedMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      setToday(localDateString(now));
      setTodayLabel(new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!today) return;
    Promise.all([getTasks(), getDailyFocusSummary(today, 1)])
      .then(([loadedTasks, focus]) => { setTasks(loadedTasks); setFocusedMinutes(focus[0]?.focused_minutes ?? 0); })
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Orbit could not load today's plan."))
      .finally(() => setIsLoading(false));
  }, [today]);

  const todayTasks = useMemo(() => tasks.filter((task) => task.scheduled_date === today), [tasks, today]);
  const openTasks = useMemo(() => todayTasks.filter((task) => !task.is_completed), [todayTasks]);
  const topThree = useMemo(() => [...openTasks].sort((first, second) => priorityOrder[first.priority] - priorityOrder[second.priority] || (first.start_time ?? "99:99").localeCompare(second.start_time ?? "99:99")).slice(0, 3), [openTasks]);
  const timedTasks = useMemo(() => openTasks.filter((task) => task.start_time), [openTasks]);
  const unscheduledTasks = useMemo(() => openTasks.filter((task) => !task.start_time), [openTasks]);
  const completedTasks = useMemo(() => todayTasks.filter((task) => task.is_completed), [todayTasks]);
  const completionRate = todayTasks.length ? Math.round((completedTasks.length / todayTasks.length) * 100) : 0;

  async function toggleTask(task: Task) {
    try {
      const updated = await updateTaskCompletion(task.id, !task.is_completed);
      setTasks((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not update that task.");
    }
  }

  async function scheduleTask(taskId: string, hour: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !today) return;
    try {
      const updated = await updateTask(task.id, { scheduled_date: today, start_time: String(hour).padStart(2, "0") + ":00", end_time: endTimeFor(hour, task.estimated_minutes) });
      setTasks((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not schedule that task.");
    } finally {
      setDraggedTaskId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, hour: number) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/orbit-task") || draggedTaskId;
    if (taskId) void scheduleTask(taskId, hour);
  }

  async function updateFocusCompletion(isCompleted: boolean) {
    if (!activeTask) return;
    const updated = await updateTaskCompletion(activeTask.id, isCompleted);
    setTasks((items) => items.map((item) => item.id === updated.id ? updated : item));
    setActiveTask(updated);
  }

  if (activeTask) return <FocusSpace task={activeTask} onExit={() => setActiveTask(null)} onUpdateCompletion={updateFocusCompletion} onEdit={() => setActiveTask(null)} />;

  return <main className="min-h-screen bg-[#040604] px-4 py-6 text-[#effaf1] sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ffbd78]">Today command center</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.045em] text-white">{todayLabel || "Loading today..."}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#aebdb2]">Plan less. Notice the next honest move, then begin.</p></div><div className="flex items-center gap-2"><Link href="/" className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm text-[#d5e3d9] hover:border-[#ff9f43]/60">Calendar</Link><Link href="/insights" className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm text-[#d5e3d9] hover:border-[#ff9f43]/60">Insights</Link></div></header>
    {error && <p role="alert" className="mt-6 rounded-2xl border border-[#ff5151]/30 bg-[#ff5151]/10 p-4 text-sm text-[#ffb0b0]">{error}</p>}
    {isLoading ? <p className="mt-12 text-[#aebdb2]">Preparing today&apos;s orbit...</p> : <><section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
      <div className="rounded-[2rem] border border-white/10 bg-[#080b08] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffbd78]">The big three</p><h2 className="mt-1 text-xl font-semibold text-white">Protect these first.</h2></div><span className="rounded-full bg-[#ff9f43]/10 px-3 py-1 text-xs font-bold text-[#ffbd78]">{topThree.length} selected</span></div><div className="mt-5 grid gap-3">{topThree.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-[#aebdb2]">Nothing is demanding your attention yet. Add a task in Calendar when you are ready.</p>}{topThree.map((task, index) => <button key={task.id} onClick={() => setActiveTask(task)} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-[#ff9f43]/50 hover:bg-[#ff9f43]/[.06]"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#ff9f43] text-sm font-black text-black">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{task.title}</span><span className="mt-1 block text-xs text-[#aebdb2]">{task.priority.replace("_", " ")}{task.start_time ? " · " + displayTime(task.start_time) : " · choose a time"}</span></span><Play size={17} className="text-[#ffbd78] transition group-hover:translate-x-0.5" /></button>)}</div></div>
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,159,67,.14),rgba(15,7,4,.82))] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffbd78]">Daily pulse</p><div className="mt-5 grid grid-cols-2 gap-3"><Pulse icon={<CheckCircle2 size={17} />} label="Promises kept" value={completedTasks.length + " / " + todayTasks.length} /><Pulse icon={<Timer size={17} />} label="Focus time" value={focusedMinutes + " min"} /></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ff9f43] transition-all duration-500" style={{ width: completionRate + "%" }} /></div><p className="mt-2 text-sm text-[#ffd1a8]">{completionRate}% of today&apos;s promises kept.</p></div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]"><div className="rounded-[2rem] border border-white/10 bg-[#080b08] p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffbd78]">Your day</p><h2 className="mt-1 text-xl font-semibold text-white">7 AM — midnight</h2></div><span className="text-xs text-[#aebdb2]">Drop a task onto an hour</span></div><div className="overflow-hidden rounded-2xl border border-white/10">{timelineHours.map((hour) => <div key={hour} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, hour)} className="group grid min-h-16 grid-cols-[4.5rem_1fr] border-b border-white/[.07] last:border-b-0"><div className="border-r border-white/[.07] px-3 py-3 text-xs font-bold text-[#8f9e93]">{hourLabel(hour)}</div><div className="p-2"><div className="min-h-10 rounded-xl transition group-hover:bg-[#ff9f43]/[.045]">{timedTasks.filter((task) => Number(task.start_time?.slice(0, 2)) === hour).map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: task.color + "22", borderLeft: "3px solid " + task.color }}><button onClick={() => void toggleTask(task)} className="grid size-5 shrink-0 place-items-center rounded-md border border-white/30 text-transparent hover:border-[#ff9f43]" aria-label={"Complete " + task.title}><Check size={13} /></button><button onClick={() => setActiveTask(task)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-white">{task.title}</span><span className="text-xs text-[#aebdb2]">{displayTime(task.start_time)} — {displayTime(task.end_time)} · {task.estimated_minutes ?? 0} min</span></button><Play size={15} className="text-[#ffbd78]" /></div>)}</div></div></div>)}</div></div>
      <aside className="rounded-[2rem] border border-white/10 bg-[#080b08] p-5"><div className="flex items-center gap-2"><Target size={17} className="text-[#ff9f43]" /><h2 className="font-semibold text-white">Unscheduled</h2></div><p className="mt-2 text-sm leading-6 text-[#aebdb2]">Drag a task onto an hour in your day.</p><div className="mt-5 space-y-2">{unscheduledTasks.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-[#8f9e93]">Your day has a place for everything.</p>}{unscheduledTasks.map((task) => <div key={task.id} draggable onDragStart={(event) => { event.dataTransfer.setData("text/orbit-task", task.id); event.dataTransfer.effectAllowed = "move"; setDraggedTaskId(task.id); }} onDragEnd={() => setDraggedTaskId(null)} className="flex cursor-grab items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3 active:cursor-grabbing"><GripVertical size={15} className="text-[#8f9e93]" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{task.title}</span><span className="text-[10px] font-bold uppercase text-[#ffbd78]">{task.priority.replace("_", " ")}</span></div>)}</div><div className="mt-6 border-t border-white/10 pt-5"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Flame size={16} className="text-[#ff9f43]" /> Done today</div><div className="mt-3 space-y-2">{completedTasks.length === 0 ? <p className="text-sm text-[#8f9e93]">Your wins will collect here.</p> : completedTasks.map((task) => <button key={task.id} onClick={() => void toggleTask(task)} className="flex w-full items-center gap-2 text-left text-sm text-[#aebdb2]"><CheckCircle2 size={15} className="shrink-0 text-[#ff9f43]" /><span className="truncate line-through">{task.title}</span></button>)}</div></div></aside></section></>}
  </div></main>;
}

function Pulse({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2 text-[#ffbd78]">{icon}<span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#d8b99c]">{label}</span></div><p className="mt-3 text-2xl font-semibold text-white">{value}</p></div>;
}
