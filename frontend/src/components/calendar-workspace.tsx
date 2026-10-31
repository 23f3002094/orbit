"use client";

import type { EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { CalendarDays, CheckCircle2, Clock3, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FocusSpace } from "@/components/focus-space";
import { TaskForm } from "@/components/task-form";
import { getTasks, updateTaskCompletion } from "@/lib/api";
import type { Task } from "@/types/task";

const eventColors = {
  must_do: "#fb7185",
  should_do: "#a78bfa",
  could_do: "#38bdf8",
} as const;

function taskToEvent(task: Task): EventInput {
  const isTimed = Boolean(task.start_time);
  return {
    id: task.id,
    title: task.title,
    start: isTimed ? `${task.scheduled_date}T${task.start_time}` : task.scheduled_date,
    end: isTimed && task.end_time ? `${task.scheduled_date}T${task.end_time}` : undefined,
    allDay: !isTimed,
    backgroundColor: eventColors[task.priority],
    borderColor: eventColors[task.priority],
    classNames: task.is_completed ? ["orbit-event-complete"] : [],
    extendedProps: { task },
  };
}

export function CalendarWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Orbit could not load your tasks."))
      .finally(() => setIsLoading(false));
  }, []);

  const events = useMemo(() => tasks.map(taskToEvent), [tasks]);
  const completedCount = tasks.filter((task) => task.is_completed).length;

  function openFocusSpace(clickInfo: EventClickArg) {
    const task = clickInfo.event.extendedProps.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  function addCreatedTask(task: Task) {
    setTasks((currentTasks) => [...currentTasks, task]);
    setIsCreating(false);
  }

  async function updateActiveTaskCompletion(isCompleted: boolean) {
    if (!activeTask) return;
    const updatedTask = await updateTaskCompletion(activeTask.id, isCompleted);
    setTasks((currentTasks) => currentTasks.map((task) => task.id === updatedTask.id ? updatedTask : task));
    setActiveTask(updatedTask);
  }

  if (activeTask) return <FocusSpace task={activeTask} onExit={() => setActiveTask(null)} onUpdateCompletion={updateActiveTaskCompletion} />;

  return (
    <main className="min-h-screen bg-[#090d18] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-8 sm:py-8">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-teal-300 text-slate-950 shadow-lg shadow-indigo-500/20"><Sparkles size={21} /></div>
            <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">Your time, in orbit</p><h1 className="text-2xl font-semibold tracking-tight">Calendar</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><CheckCircle2 size={16} className="text-teal-300" /> {completedCount}/{tasks.length} complete</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"><Clock3 size={16} className="text-indigo-300" /> Click a task to focus</span>
            <button onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-3.5 py-2 font-semibold text-slate-950 transition hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"><Plus size={17} /> New task</button>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-h-[720px] rounded-3xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-slate-950/30 backdrop-blur sm:p-5">
            {isLoading && <CalendarMessage title="Loading your schedule" detail="Getting your tasks ready..." />}
            {error && <CalendarMessage title="Could not connect to Orbit API" detail={`${error} Start the FastAPI server on port 8000, then refresh.`} />}
            {!isLoading && !error && <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }} buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }} events={events} eventClick={openFocusSpace} nowIndicator allDayText="Unscheduled" slotMinTime="06:00:00" slotMaxTime="23:00:00" height="auto" dayMaxEventRows={3} eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }} />}
          </div>

          <aside className="rounded-3xl border border-white/10 bg-gradient-to-b from-indigo-500/[0.11] to-white/[0.025] p-5">
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-indigo-100"><CalendarDays size={17} /> This week</div>
            <div className="space-y-3">{(["must_do", "should_do", "could_do"] as const).map((priority) => <div key={priority} className="rounded-2xl bg-black/20 p-3"><div className="mb-2 flex items-center gap-2 text-sm capitalize text-slate-300"><span className="size-2 rounded-full" style={{ backgroundColor: eventColors[priority] }} />{priority.replace("_", " ")}</div><p className="text-2xl font-semibold">{tasks.filter((task) => task.priority === priority).length}</p></div>)}</div>
            <p className="mt-6 text-sm leading-6 text-slate-400">Plan first, then enter focus when it is time to act. Orbit keeps both views connected.</p>
          </aside>
        </section>
      </div>

      {isCreating && <TaskForm onClose={() => setIsCreating(false)} onCreated={addCreatedTask} />}
    </main>
  );
}

function CalendarMessage({ title, detail }: { title: string; detail: string }) {
  return <div className="grid min-h-[600px] place-items-center text-center"><div><p className="text-lg font-medium text-white">{title}</p><p className="mt-2 max-w-sm text-sm text-slate-400">{detail}</p></div></div>;
}
