"use client";

import type { EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Plus, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FocusSpace } from "@/components/focus-space";
import { TaskForm } from "@/components/task-form";
import { getTasks, updateTaskCompletion } from "@/lib/api";
import type { Task } from "@/types/task";

const eventColors = { must_do: "#ff5151", should_do: "#46ff96", could_do: "#a3ccae" } as const;

function taskToEvent(task: Task): EventInput {
  const isTimed = Boolean(task.start_time);
  return { id: task.id, title: task.title, start: isTimed ? `${task.scheduled_date}T${task.start_time}` : task.scheduled_date, end: isTimed && task.end_time ? `${task.scheduled_date}T${task.end_time}` : undefined, allDay: !isTimed, backgroundColor: eventColors[task.priority], borderColor: eventColors[task.priority], classNames: task.is_completed ? ["orbit-event-complete"] : [], extendedProps: { task } };
}

export function CalendarWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { getTasks().then(setTasks).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Orbit could not load your tasks.")).finally(() => setIsLoading(false)); }, []);
  const events = useMemo(() => tasks.map(taskToEvent), [tasks]);
  const completedCount = tasks.filter((task) => task.is_completed).length;
  const focusMinutes = tasks.reduce((total, task) => total + (task.estimated_minutes ?? 0), 0);
  function openFocusSpace(clickInfo: EventClickArg) { const task = clickInfo.event.extendedProps.task as Task | undefined; if (task) setActiveTask(task); }
  function addCreatedTask(task: Task) { setTasks((currentTasks) => [...currentTasks, task]); setIsCreating(false); }
  async function updateActiveTaskCompletion(isCompleted: boolean) { if (!activeTask) return; const updatedTask = await updateTaskCompletion(activeTask.id, isCompleted); setTasks((currentTasks) => currentTasks.map((task) => task.id === updatedTask.id ? updatedTask : task)); setActiveTask(updatedTask); }
  if (activeTask) return <FocusSpace task={activeTask} onExit={() => setActiveTask(null)} onUpdateCompletion={updateActiveTaskCompletion} />;

  return (
    <main className="min-h-screen bg-[#040604] text-[#effaf1]">
      <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-7 sm:py-7">
        <header className="mb-6 flex flex-col gap-5 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(115deg,rgba(70,255,150,.10),rgba(3,5,4,.75)_40%,rgba(255,81,81,.08))] p-5 shadow-2xl shadow-black/25 backdrop-blur sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-5 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#46ff96] text-black shadow-lg shadow-[#46ff96]/20"><Sparkles size={20} /></div><span className="text-sm font-bold tracking-[0.18em] text-[#9cffc5]">ORBIT</span></div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a8a]">Plan with intention</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Your time has a shape.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#aebdb2]">Schedule what matters, then move into a room built for doing it.</p></div>
          <div className="flex flex-wrap items-center gap-3"><div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9a90]">Promises kept</p><p className="mt-1 text-xl font-semibold text-[#46ff96]">{completedCount}<span className="text-sm text-[#839087]"> / {tasks.length}</span></p></div><div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9a90]">Planned focus</p><p className="mt-1 text-xl font-semibold text-white">{focusMinutes}<span className="text-sm text-[#839087]"> min</span></p></div><button onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#46ff96] px-4 py-3.5 font-bold text-black shadow-lg shadow-[#46ff96]/15 transition hover:bg-[#96ffc1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#46ff96]"><Plus size={18} /> New task</button></div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
          <aside className="rounded-[1.75rem] border border-white/[0.08] bg-[#080b08] p-4"><p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#8c9a90]">Your orbit</p><div className="space-y-1"><div className="flex items-center gap-3 rounded-xl bg-[#46ff96]/10 px-3 py-3 text-sm font-semibold text-[#9cffc5]"><CalendarDays size={17} /> Calendar</div><div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#9fad9f]"><Target size={17} /> Focus sessions</div><div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#9fad9f]"><CheckCircle2 size={17} /> Review later</div></div><div className="mt-8 rounded-2xl border border-[#ff5151]/20 bg-[#ff5151]/[0.06] p-4"><p className="text-xs font-bold text-[#ff9696]">Small reminder</p><p className="mt-2 text-sm leading-6 text-[#c7d0c9]">Do not plan a perfect week. Plan the next honest move.</p></div></aside>

          <div className="min-h-[720px] rounded-[1.75rem] border border-white/[0.08] bg-[#080b08] p-3 shadow-2xl shadow-black/30 sm:p-5">{isLoading && <CalendarMessage title="Building your orbit" detail="Getting your schedule ready..." />}{error && <CalendarMessage title="Could not connect to Orbit API" detail={`${error} Start the FastAPI server on port 8000, then refresh.`} />}{!isLoading && !error && <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }} buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }} events={events} eventClick={openFocusSpace} nowIndicator allDayText="Unscheduled" slotMinTime="06:00:00" slotMaxTime="23:00:00" height="auto" dayMaxEventRows={3} eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }} />}</div>

          <aside className="rounded-[1.75rem] border border-white/[0.08] bg-[#080b08] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 size={17} className="text-[#46ff96]" /> Workload pulse</div><p className="mt-2 text-sm leading-6 text-[#8f9e93]">A calm view of what is asking for your energy.</p><div className="mt-6 space-y-3">{(["must_do", "should_do", "could_do"] as const).map((priority) => <div key={priority} className="rounded-2xl border border-white/[0.07] bg-black/25 p-3"><div className="mb-3 flex items-center justify-between text-sm capitalize text-[#cbd8ce]"><span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: eventColors[priority] }} />{priority.replace("_", " ")}</span><ChevronRight size={15} className="text-[#607065]" /></div><p className="text-2xl font-semibold text-white">{tasks.filter((task) => task.priority === priority).length}</p></div>)}</div><div className="mt-6 rounded-2xl bg-[#46ff96]/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8dffbb]">Focus hint</p><p className="mt-2 text-sm leading-6 text-[#d9e8dc]">Click a task when you are ready. Planning disappears; the room remains.</p></div></aside>
        </section>
      </div>
      {isCreating && <TaskForm onClose={() => setIsCreating(false)} onCreated={addCreatedTask} />}
    </main>
  );
}

function CalendarMessage({ title, detail }: { title: string; detail: string }) { return <div className="grid min-h-[600px] place-items-center text-center"><div><p className="text-lg font-medium text-white">{title}</p><p className="mt-2 max-w-sm text-sm text-[#8f9e93]">{detail}</p></div></div>; }
