"use client";

import type { EventApi, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { ChevronRight, Clock3, Flame, Plus, Sparkles } from "lucide-react";
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FocusSpace } from "@/components/focus-space";
import { TaskForm } from "@/components/task-form";
import { CelebrationBurst } from "@/components/celebration-burst";
import { OrbitNav } from "@/components/orbit-nav";
import { deleteTask, getTaskStreak, getTasks, updateTask, updateTaskCompletion } from "@/lib/api";
import type { Task } from "@/types/task";
import type { TaskStreakSummary } from "@/types/focus";

const priorityColors = { must_do: "#ff6f91", should_do: "#a855f7", could_do: "#9fa0c9" } as const;
interface HoveredTimeSlot { left: number; top: number; width: number; height: number; }

function taskToEvent(task: Task): EventInput {
  const isTimed = Boolean(task.start_time);
  return { id: task.id, title: task.title, start: isTimed ? `${task.scheduled_date}T${task.start_time}` : task.scheduled_date, end: isTimed && task.end_time ? `${task.scheduled_date}T${task.end_time}` : undefined, allDay: !isTimed, backgroundColor: task.color, borderColor: task.color, textColor: "#071009", classNames: task.is_completed ? ["orbit-event-complete"] : [], extendedProps: { task } };
}

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CalendarWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskActionTarget, setTaskActionTarget] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>();
  const [streak, setStreak] = useState<TaskStreakSummary>({ current_streak: 0, longest_streak: 0, last_completed_date: null });
  const [initialSchedule, setInitialSchedule] = useState<{ date: string; startTime: string; endTime: string } | undefined>();
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<HoveredTimeSlot | null>(null);
  const [celebration, setCelebration] = useState<{ kind: "welcome" | "task"; signal: number }>({ kind: "welcome", signal: 0 });
  const refreshStreak = useCallback(() => {
    getTaskStreak(localDateString(new Date())).then(setStreak).catch(() => { /* Dashboard remains usable when insights are unavailable. */ });
  }, []);

  useEffect(() => { getTasks().then(setTasks).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Orbit could not load your tasks.")).finally(() => setIsLoading(false)); }, []);
  useEffect(() => { refreshStreak(); }, [refreshStreak]);
  useEffect(() => {
    const welcomeKey = "orbit-welcome-seen";
    if (window.sessionStorage.getItem(welcomeKey)) return;
    window.sessionStorage.setItem(welcomeKey, "true");
    const timer = window.setTimeout(() => setCelebration((current) => ({ kind: "welcome", signal: current.signal + 1 })), 350);
    return () => window.clearTimeout(timer);
  }, []);
  const events = useMemo(() => tasks.map(taskToEvent), [tasks]);
  const completedCount = tasks.filter((task) => task.is_completed).length;
  const focusMinutes = tasks.reduce((total, task) => total + (task.estimated_minutes ?? 0), 0);
  function openFocusSpace(clickInfo: EventClickArg) { const task = clickInfo.event.extendedProps.task as Task | undefined; if (task) setTaskActionTarget(task); }
  function addCreatedTask(task: Task) { setTasks((currentTasks) => [...currentTasks, task]); setIsCreating(false); setCelebration((current) => ({ kind: "task", signal: current.signal + 1 })); refreshStreak(); }
  function updateSavedTask(task: Task) { setTasks((currentTasks) => currentTasks.map((item) => item.id === task.id ? task : item)); setTaskToEdit(undefined); setIsCreating(false); refreshStreak(); }
  function removeDeletedTask(taskId: string) { setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId)); setTaskToEdit(undefined); setIsCreating(false); refreshStreak(); }
  async function deleteTaskFromActions(task: Task) {
    if (!window.confirm("Delete \"" + task.title + "\"? This cannot be undone.")) return;
    try { await deleteTask(task.id); removeDeletedTask(task.id); setTaskActionTarget(null); }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not delete that task."); }
  }
  function formatTimeForInput(date: Date) { return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
  function openTaskFormForSlot(clickInfo: DateClickArg) {
    const date = clickInfo.dateStr.slice(0, 10);
    if (clickInfo.allDay) setInitialSchedule({ date, startTime: "", endTime: "" });
    else {
      const end = new Date(clickInfo.date.getTime() + 60 * 60 * 1000);
      setInitialSchedule({ date, startTime: formatTimeForInput(clickInfo.date), endTime: formatTimeForInput(end) });
    }
    setIsCreating(true);
  }
  function formatDateForInput(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function scheduleUpdateFromEvent(event: EventApi) {
    if (!event.start) throw new Error("The calendar event has no start time.");
    if (event.allDay) return { scheduled_date: event.startStr.slice(0, 10), start_time: null, end_time: null };
    return { scheduled_date: formatDateForInput(event.start), start_time: formatTimeForInput(event.start), end_time: event.end ? formatTimeForInput(event.end) : null };
  }
  async function persistCalendarScheduleChange(changeInfo: EventDropArg | EventResizeDoneArg) {
    try {
      const updatedTask = await updateTask(changeInfo.event.id, scheduleUpdateFromEvent(changeInfo.event));
      setTasks((currentTasks) => currentTasks.map((task) => task.id === updatedTask.id ? updatedTask : task));
    } catch (requestError: unknown) {
      changeInfo.revert();
      setError(requestError instanceof Error ? requestError.message : "Orbit could not update that schedule.");
    }
  }
  function trackTimeSlot(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".fc-event")) { setHoveredTimeSlot(null); return; }
    const timeGrid = target.closest(".fc-timegrid");
    if (!timeGrid) { setHoveredTimeSlot(null); return; }
    const elementsAtPointer = document.elementsFromPoint(event.clientX, event.clientY);
    const column = elementsAtPointer.find((element) => element.classList.contains("fc-timegrid-col"));
    const slot = Array.from(timeGrid.querySelectorAll<HTMLElement>(".fc-timegrid-slot-lane[data-time]")).find((element) => {
      const rect = element.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY < rect.bottom;
    });
    if (!column || !slot) { setHoveredTimeSlot(null); return; }
    const columnRect = column.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const nextSlot = { left: columnRect.left, top: slotRect.top, width: columnRect.width, height: slotRect.height };
    setHoveredTimeSlot((current) => current && current.left === nextSlot.left && current.top === nextSlot.top && current.width === nextSlot.width && current.height === nextSlot.height ? current : nextSlot);
  }
  async function updateActiveTaskCompletion(isCompleted: boolean) { if (!activeTask) return; const updatedTask = await updateTaskCompletion(activeTask.id, isCompleted); setTasks((currentTasks) => currentTasks.map((task) => task.id === updatedTask.id ? updatedTask : task)); setActiveTask(updatedTask); refreshStreak(); }
  if (activeTask) return <FocusSpace task={activeTask} onExit={() => setActiveTask(null)} onUpdateCompletion={updateActiveTaskCompletion} onUpdateTask={(updatedTask) => { setTasks((items) => items.map((item) => item.id === updatedTask.id ? updatedTask : item)); setActiveTask(updatedTask); }} onDeleteTask={(taskId) => { setTasks((items) => items.filter((item) => item.id !== taskId)); setActiveTask(null); refreshStreak(); }} />;

  return (
    <main className="orbit-calendar-shell min-h-screen bg-[#040604] text-[#effaf1]">
      <CelebrationBurst kind={celebration.kind} signal={celebration.signal} />
      <div className="relative z-10 mx-auto max-w-[1700px] px-4 py-5 sm:px-7 sm:py-7">
        <header className="mb-6 flex flex-col gap-5 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(115deg,rgba(255,159,67,.16),rgba(20,8,5,.78)_40%,rgba(220,74,32,.10))] p-5 shadow-2xl shadow-black/25 backdrop-blur sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-5 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#46ff96] text-black shadow-lg shadow-[#46ff96]/20"><Sparkles size={20} /></div><span className="text-sm font-bold tracking-[0.18em] text-[#9cffc5]">ORBIT</span></div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff8a8a]">Plan with intention</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Your time has a shape.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#aebdb2]">Click empty slots to create. Drag events to reschedule, or drag their lower edge to change duration.</p></div>
          <div className="flex flex-wrap items-center gap-3"><div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9a90]">Promises kept</p><p className="mt-1 text-xl font-semibold text-[#46ff96]">{completedCount}<span className="text-sm text-[#839087]"> / {tasks.length}</span></p></div><div className="rounded-2xl border border-[#ff7a3d]/20 bg-[#ff7a3d]/[0.06] px-4 py-3"><p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffad7f]"><Flame size={12} fill="currentColor" /> Current streak</p><p className="mt-1 text-xl font-semibold text-[#ff914d]">{streak.current_streak}<span className="text-sm text-[#b87e5d]"> days</span></p></div><div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8c9a90]">Planned focus</p><p className="mt-1 text-xl font-semibold text-white">{focusMinutes}<span className="text-sm text-[#839087]"> min</span></p></div><button onClick={() => { setInitialSchedule(undefined); setTaskToEdit(undefined); setIsCreating(true); }} className="inline-flex items-center gap-2 rounded-2xl bg-[#46ff96] px-4 py-3.5 font-bold text-black shadow-lg shadow-[#46ff96]/15 transition hover:bg-[#96ffc1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#46ff96]"><Plus size={18} /> New task</button></div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
          <div><OrbitNav /><div className="mt-8 rounded-2xl border border-[#ff5151]/20 bg-[#ff5151]/[0.06] p-4"><p className="text-xs font-bold text-[#ff9696]">Small reminder</p><p className="mt-2 text-sm leading-6 text-[#c7d0c9]">Do not plan a perfect week. Plan the next honest move.</p></div></div>

          <div onMouseMove={trackTimeSlot} onMouseLeave={() => setHoveredTimeSlot(null)} className="min-h-[720px] rounded-[1.75rem] border border-white/[0.08] bg-[#080b08] p-3 shadow-2xl shadow-black/30 sm:p-5">{isLoading && <CalendarMessage title="Building your orbit" detail="Getting your schedule ready..." />}{error && <CalendarMessage title="Could not connect to Orbit API" detail={`${error} Start the FastAPI server on port 8000, then refresh.`} />}{!isLoading && !error && <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }} buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }} events={events} eventClick={openFocusSpace} eventDrop={persistCalendarScheduleChange} eventResize={persistCalendarScheduleChange} editable eventDurationEditable dateClick={openTaskFormForSlot} nowIndicator allDayText="Unscheduled" slotMinTime="07:00:00" slotMaxTime="24:00:00" height="auto" dayMaxEventRows={3} eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }} />}</div>

          <aside className="rounded-[1.75rem] border border-white/[0.08] bg-[#080b08] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 size={17} className="text-[#46ff96]" /> Workload pulse</div><p className="mt-2 text-sm leading-6 text-[#8f9e93]">A calm view of what is asking for your energy.</p><div className="mt-6 space-y-3">{(["must_do", "should_do", "could_do"] as const).map((priority) => <div key={priority} className="rounded-2xl border border-white/[0.07] bg-black/25 p-3"><div className="mb-3 flex items-center justify-between text-sm capitalize text-[#cbd8ce]"><span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: priorityColors[priority] }} />{priority.replace("_", " ")}</span><ChevronRight size={15} className="text-[#607065]" /></div><p className="text-2xl font-semibold text-white">{tasks.filter((task) => task.priority === priority).length}</p></div>)}</div><div className="mt-6 rounded-2xl bg-[#46ff96]/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8dffbb]">Focus hint</p><p className="mt-2 text-sm leading-6 text-[#d9e8dc]">Click an empty slot to plan there. Click a task when you are ready to focus.</p></div></aside>
        </section>
      </div>
      {hoveredTimeSlot && <div className="pointer-events-none fixed z-10 rounded-md border border-[#ff9f43]/70 bg-[#ff9f43]/[0.07] shadow-[inset_0_0_18px_rgba(255,159,67,.10)]" style={hoveredTimeSlot} />}
      {isCreating && <TaskForm initialSchedule={initialSchedule} taskToEdit={taskToEdit} onClose={() => { setTaskToEdit(undefined); setIsCreating(false); }} onCreated={addCreatedTask} onUpdated={updateSavedTask} onDeleted={removeDeletedTask} />}
      {taskActionTarget && <TaskActionMenu task={taskActionTarget} onClose={() => setTaskActionTarget(null)} onFocus={() => { setActiveTask(taskActionTarget); setTaskActionTarget(null); }} onEdit={() => { setTaskToEdit(taskActionTarget); setTaskActionTarget(null); setIsCreating(true); }} onDelete={() => { void deleteTaskFromActions(taskActionTarget); }} />}
    </main>
  );
}

function CalendarMessage({ title, detail }: { title: string; detail: string }) { return <div className="grid min-h-[600px] place-items-center text-center"><div><p className="text-lg font-medium text-white">{title}</p><p className="mt-2 max-w-sm text-sm text-[#8f9e93]">{detail}</p></div></div>; }

function TaskActionMenu({ task, onClose, onFocus, onEdit, onDelete }: { task: Task; onClose: () => void; onFocus: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="task-action-title" onMouseDown={(event) => event.stopPropagation()} className="orbit-task-action-menu w-full max-w-sm rounded-3xl p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffbd78]">Task options</p><h2 id="task-action-title" className="mt-2 truncate text-xl font-semibold text-white">{task.title}</h2><p className="mt-2 text-sm text-[#aebdb2]">What would you like to do?</p><div className="mt-6 grid gap-3"><button onClick={onFocus} className="flex items-center justify-between rounded-2xl bg-[#ff9f43] px-4 py-4 text-left font-bold text-black transition hover:bg-[#ffc078]"><span>Enter Focus Room</span><Clock3 size={19} /></button><button onClick={onEdit} className="rounded-2xl border border-white/15 bg-white/[.04] px-4 py-4 text-left font-semibold text-white transition hover:border-[#ff9f43]/60 hover:bg-[#ff9f43]/[.07]">Edit task details</button><button onClick={onDelete} className="rounded-2xl px-4 py-2 text-left text-sm font-semibold text-[#ff8b8b] transition hover:bg-[#ff5151]/10">Delete task</button><button onClick={onClose} className="py-2 text-sm font-medium text-[#aebdb2] hover:text-white">Cancel</button></div></section></div>;
}
