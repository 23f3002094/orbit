"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, GripVertical, Pause, Play, Plus, RotateCcw, Target } from "lucide-react";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

import { createSubtask, getSubtasks, updateSubtaskCompletion } from "@/lib/api";
import type { Subtask } from "@/types/subtask";
import type { Task } from "@/types/task";

interface FocusSpaceProps {
  task: Task;
  onExit: () => void;
  onUpdateCompletion: (isCompleted: boolean) => Promise<void>;
}

const WORK_MINUTES = 25;

function formatRemaining(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FocusSpace({ task, onExit, onUpdateCompletion }: FocusSpaceProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(WORK_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [isSavingSubtask, setIsSavingSubtask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerPosition, setTimerPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; timerX: number; timerY: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let isCurrent = true;
    getSubtasks(task.id).then((items) => {
      if (isCurrent) setSubtasks(items);
    }).catch(() => {
      if (isCurrent) setError("Orbit could not load this session's subtasks.");
    });
    return () => { isCurrent = false; };
  }, [task.id]);

  useEffect(() => {
    if (!isRunning || remainingSeconds === 0) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0) setIsRunning(false);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, remainingSeconds]);

  const progress = ((WORK_MINUTES * 60 - remainingSeconds) / (WORK_MINUTES * 60)) * 100;
  const completedSubtasks = subtasks.filter((subtask) => subtask.is_completed).length;

  async function toggleTaskCompletion() {
    setError(null);
    setIsSavingCompletion(true);
    try { await onUpdateCompletion(!task.is_completed); }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not update that task."); }
    finally { setIsSavingCompletion(false); }
  }

  async function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newSubtask.trim();
    if (!title) return;
    setError(null);
    setIsSavingSubtask(true);
    try {
      const created = await createSubtask(task.id, title);
      setSubtasks((items) => [...items, created]);
      setNewSubtask("");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not create that subtask.");
    } finally { setIsSavingSubtask(false); }
  }

  async function toggleSubtask(subtask: Subtask) {
    setError(null);
    try {
      const updated = await updateSubtaskCompletion(subtask.id, !subtask.is_completed);
      setSubtasks((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not update that subtask.");
    }
  }

  function beginTimerDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = { x: event.clientX, y: event.clientY, timerX: timerPosition.x, timerY: timerPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveTimer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const nextX = Math.max(-110, Math.min(110, dragStart.current.timerX + event.clientX - dragStart.current.x));
    const nextY = Math.max(-90, Math.min(90, dragStart.current.timerY + event.clientY - dragStart.current.y));
    setTimerPosition({ x: nextX, y: nextY });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030604] px-4 py-5 text-[#eafff1] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_14%_18%,rgba(27,255,125,0.16),transparent_30%),radial-gradient(ellipse_at_86%_78%,rgba(255,54,54,0.13),transparent_28%),linear-gradient(120deg,#030604_20%,#07130c_50%,#090505)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,.7)_0.6px,transparent_0.6px)] [background-size:5px_5px]" />
      <button onClick={onExit} className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-[#b9c9be] backdrop-blur transition hover:border-[#35ff93]/50 hover:text-[#eafff1] focus-visible:outline-2 focus-visible:outline-[#35ff93]"><ArrowLeft size={16} /> Return to calendar</button>

      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative z-10 mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl items-center gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-7 flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[#35ff93]/25 bg-[#35ff93]/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[#7dffb6]"><Target size={14} /> FOCUS MODE</span><span className="text-xs uppercase tracking-[0.16em] text-[#ff7474]">{task.priority.replace("_", " ")}</span></div>
          <p className="mb-3 text-sm font-medium text-[#86a18f]">{task.category} / {task.estimated_minutes ?? 25} minutes planned</p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.06] tracking-[-0.04em] text-white sm:text-6xl">{task.title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#a9b9ae]">Make the next focused block count. Break this work into visible moves, then begin when you are ready.</p>

          <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-2">
            <button onClick={toggleTaskCompletion} disabled={isSavingCompletion} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#35ff93] disabled:opacity-60 ${task.is_completed ? "bg-[#35ff93] text-black" : "border border-white/10 bg-white/[0.06] text-white hover:border-[#35ff93]/55 hover:bg-[#35ff93]/10"}`}><Check size={18} /> {isSavingCompletion ? "Saving..." : task.is_completed ? "Task complete" : "Mark task complete"}</button>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-sm text-[#b9c9be]"><span className="text-[#35ff93]">{completedSubtasks}</span> of {subtasks.length} session steps done</div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold text-white">Session breakdown</h2><span className="text-xs text-[#86a18f]">for this task</span></div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{subtasks.length === 0 && <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-[#86a18f]">Add the first small action. Keep it concrete.</p>}{subtasks.map((subtask) => <button key={subtask.id} onClick={() => toggleSubtask(subtask)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.05]"><span className={`grid size-5 shrink-0 place-items-center rounded-md border ${subtask.is_completed ? "border-[#35ff93] bg-[#35ff93] text-black" : "border-white/20"}`}>{subtask.is_completed && <Check size={13} strokeWidth={3} />}</span><span className={`text-sm ${subtask.is_completed ? "text-[#718077] line-through" : "text-[#edf6ef]"}`}>{subtask.title}</span></button>)}</div>
          <form onSubmit={addSubtask} className="mt-4 flex gap-2 border-t border-white/10 pt-4"><label className="sr-only" htmlFor="subtask-title">Add a session step</label><input id="subtask-title" value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} maxLength={200} placeholder="Add a small next step" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#617168] focus:border-[#35ff93]" /><button disabled={isSavingSubtask} className="grid size-10 place-items-center rounded-xl bg-[#35ff93] text-black transition hover:bg-[#85ffb5] disabled:opacity-60" aria-label="Add subtask"><Plus size={18} /></button></form>
        </section>
      </motion.div>

      <section style={{ transform: `translate(${timerPosition.x}px, ${timerPosition.y}px)` }} className="fixed bottom-5 right-5 z-20 w-72 rounded-[1.75rem] border border-[#35ff93]/25 bg-[#07120b]/90 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl sm:bottom-8 sm:right-8">
        <div onPointerDown={beginTimerDrag} onPointerMove={moveTimer} onPointerUp={() => { dragStart.current = null; }} className="mb-3 flex cursor-grab touch-none items-center justify-between text-xs text-[#86a18f] active:cursor-grabbing"><span className="flex items-center gap-1.5 uppercase tracking-[0.15em]"><GripVertical size={15} /> Drag timer</span><span className="text-[#ff7474]">POMODORO</span></div>
        <div className="grid place-items-center"><div className="grid size-40 place-items-center rounded-full p-2" style={{ background: `conic-gradient(#35ff93 ${progress}%, rgba(255,255,255,.10) ${progress}%)` }}><div className="grid size-full place-items-center rounded-full bg-[#07120b]"><span className="font-mono text-4xl font-medium tracking-[-0.08em] text-white">{formatRemaining(remainingSeconds)}</span><span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#86a18f]">deep work</span></div></div></div>
        <div className="mt-4 grid grid-cols-3 gap-2"><button onClick={() => setIsRunning((running) => !running)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#35ff93] px-3 py-2.5 text-sm font-bold text-black hover:bg-[#85ffb5]">{isRunning ? <Pause size={15} /> : <Play size={15} />}{isRunning ? "Pause" : "Start"}</button><button onClick={() => { setRemainingSeconds(WORK_MINUTES * 60); setIsRunning(false); }} className="rounded-xl border border-white/10 px-3 py-2.5 text-[#d9e8dd] hover:bg-white/[0.06]" aria-label="Reset timer"><RotateCcw size={16} className="mx-auto" /></button><span className="grid place-items-center rounded-xl bg-[#ff4949]/10 text-xs font-medium text-[#ff8585]">25 min</span></div>
      </section>
      {error && <p role="alert" className="fixed bottom-5 left-5 z-30 max-w-sm rounded-xl border border-[#ff4949]/30 bg-[#2a0808]/90 px-4 py-3 text-sm text-[#ffaaaa]">{error}</p>}
    </main>
  );
}
