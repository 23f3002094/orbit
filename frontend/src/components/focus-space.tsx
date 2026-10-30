"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";

import type { Task } from "@/types/task";

interface FocusSpaceProps { task: Task; onExit: () => void; }

const WORK_MINUTES = 25;

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FocusSpace({ task, onExit }: FocusSpaceProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(WORK_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(task.is_completed);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => { setRemainingSeconds(WORK_MINUTES * 60); setIsRunning(false); setIsComplete(task.is_completed); }, [task]);
  useEffect(() => {
    if (!isRunning || remainingSeconds === 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, remainingSeconds]);
  useEffect(() => { if (remainingSeconds === 0) setIsRunning(false); }, [remainingSeconds]);

  const progress = ((WORK_MINUTES * 60 - remainingSeconds) / (WORK_MINUTES * 60)) * 100;

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#070b17] px-5 py-8 text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(102,126,234,0.25),transparent_32%),radial-gradient(circle_at_80%_85%,rgba(45,212,191,0.15),transparent_28%)]" />
      <button className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300" onClick={onExit}><ArrowLeft size={16} /> Back to schedule</button>
      <motion.section initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950/45 p-7 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:p-12">
        <div className="mb-10 flex items-center justify-between gap-4"><span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-medium tracking-wide text-teal-200">FOCUS SESSION</span><span className="text-sm text-slate-400">{task.estimated_minutes ?? 25} min planned</span></div>
        <p className="mb-3 text-sm font-medium text-indigo-200">{task.category} · {task.priority.replace("_", " ")}</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">{task.title}</h1>
        <div className="my-12 grid place-items-center"><div className="grid size-64 place-items-center rounded-full p-3 sm:size-72" style={{ background: `conic-gradient(#5eead4 ${progress}%, rgba(255,255,255,.09) ${progress}%)` }} aria-label={`${formatRemaining(remainingSeconds)} remaining`}><div className="grid size-full place-items-center rounded-full bg-[#10182b]"><span className="font-mono text-5xl font-medium tracking-tight text-white sm:text-6xl">{formatRemaining(remainingSeconds)}</span><span className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Deep work</span></div></div></div>
        <div className="flex flex-wrap justify-center gap-3">
          <button className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300" onClick={() => setIsRunning((running) => !running)}>{isRunning ? <Pause size={18} /> : <Play size={18} />}{isRunning ? "Pause" : "Start"}</button>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-slate-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300" onClick={() => { setRemainingSeconds(WORK_MINUTES * 60); setIsRunning(false); }}><RotateCcw size={18} /> Reset</button>
          <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${isComplete ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-slate-200 hover:bg-white/10"}`} onClick={() => setIsComplete((complete) => !complete)}><Check size={18} /> {isComplete ? "Completed" : "Mark complete"}</button>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-slate-500"><TimerReset size={15} /> A simple 25-minute session for now. Session logging comes next.</p>
      </motion.section>
    </main>
  );
}
