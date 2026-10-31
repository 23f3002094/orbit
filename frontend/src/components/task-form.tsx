"use client";

import { X } from "lucide-react";
import { FormEvent, useState } from "react";

import { createTask } from "@/lib/api";
import type { CreateTaskInput, Task, TaskPriority } from "@/types/task";

interface TaskFormProps {
  onClose: () => void;
  onCreated: (task: Task) => void;
}

const inputClassName = "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/20";

export function TaskForm({ onClose, onCreated }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("should_do");
  const [category, setCategory] = useState("Personal");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (Boolean(startTime) !== Boolean(endTime)) {
      setError("Add both a start and end time, or leave both blank.");
      return;
    }

    const input: CreateTaskInput = {
      title: title.trim(),
      scheduled_date: scheduledDate,
      start_time: startTime || null,
      end_time: endTime || null,
      priority,
      category: category.trim(),
      estimated_minutes: estimatedMinutes || null,
    };

    setIsSubmitting(true);
    try {
      onCreated(await createTask(input));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not create that task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="presentation">
      <section aria-labelledby="create-task-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">Plan with intention</p><h2 id="create-task-title" className="mt-1 text-xl font-semibold text-white">New task</h2></div><button type="button" onClick={onClose} aria-label="Close create task form" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={19} /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-200">Task title<input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClassName} placeholder="What needs your attention?" maxLength={200} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-200">Date<input required type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className={inputClassName} /></label><label className="block text-sm font-medium text-slate-200">Estimated minutes<input required min="1" type="number" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} className={inputClassName} /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-200">Start time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClassName} /></label><label className="block text-sm font-medium text-slate-200">End time<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClassName} /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-200">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className={inputClassName}><option value="must_do">Must do</option><option value="should_do">Should do</option><option value="could_do">Could do</option></select></label><label className="block text-sm font-medium text-slate-200">Category<input required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName} maxLength={50} /></label></div>
          {error && <p role="alert" className="rounded-xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10">Cancel</button><button disabled={isSubmitting} className="rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Adding…" : "Add to calendar"}</button></div>
        </form>
      </section>
    </div>
  );
}
