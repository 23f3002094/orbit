"use client";

import { X } from "lucide-react";
import { FormEvent, useState } from "react";

import { createTask, deleteTask, updateTask } from "@/lib/api";
import type { CreateTaskInput, Task, TaskPriority } from "@/types/task";

interface TaskFormProps {
  onClose: () => void;
  onCreated: (task: Task) => void;
  taskToEdit?: Task;
  onUpdated?: (task: Task) => void;
  onDeleted?: (taskId: string) => void;
  initialSchedule?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

const inputClassName = "mt-1 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#617168] focus:border-[#46ff96] focus:ring-2 focus:ring-[#46ff96]/20";

export function TaskForm({ onClose, onCreated, initialSchedule, taskToEdit, onUpdated, onDeleted }: TaskFormProps) {
  const isEditing = Boolean(taskToEdit);
  const [title, setTitle] = useState(taskToEdit?.title ?? "");
  const [scheduledDate, setScheduledDate] = useState(taskToEdit?.scheduled_date ?? initialSchedule?.date ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(taskToEdit?.start_time?.slice(0, 5) ?? initialSchedule?.startTime ?? "");
  const [endTime, setEndTime] = useState(taskToEdit?.end_time?.slice(0, 5) ?? initialSchedule?.endTime ?? "");
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority ?? "should_do");
  const [category, setCategory] = useState(taskToEdit?.category ?? "Personal");
  const [color, setColor] = useState(taskToEdit?.color ?? "#ff8a2a");
  const [estimatedMinutes, setEstimatedMinutes] = useState(taskToEdit?.estimated_minutes ?? 30);
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
      color,
      estimated_minutes: estimatedMinutes || null,
    };

    setIsSubmitting(true);
    try {
      const savedTask = taskToEdit ? await updateTask(taskToEdit.id, input) : await createTask(input);
      if (taskToEdit) onUpdated?.(savedTask);
      else onCreated(savedTask);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not create that task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!taskToEdit || !window.confirm(`Delete "${taskToEdit.title}" permanently?`)) return;
    setIsSubmitting(true);
    try { await deleteTask(taskToEdit.id); onDeleted?.(taskToEdit.id); }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not delete that task."); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="presentation">
      <section aria-labelledby="create-task-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#090c09] p-6 shadow-2xl shadow-black/70">
        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8dffbb]">Plan with intention</p><h2 id="create-task-title" className="mt-1 text-xl font-semibold text-white">{isEditing ? "Edit task" : "New task"}</h2></div><button type="button" onClick={onClose} aria-label="Close task form" className="rounded-lg p-2 text-[#8f9e93] transition hover:bg-white/10 hover:text-white"><X size={19} /></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-200">Task title<input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClassName} placeholder="What needs your attention?" maxLength={200} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-200">Date<input required type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className={inputClassName} /></label><label className="block text-sm font-medium text-slate-200">Estimated minutes<input required min="1" type="number" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} className={inputClassName} /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-200">Start time<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClassName} /></label><label className="block text-sm font-medium text-slate-200">End time<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClassName} /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-200">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className={inputClassName}><option value="must_do">Must do</option><option value="should_do">Should do</option><option value="could_do">Could do</option></select></label><label className="block text-sm font-medium text-slate-200">Category<input required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName} maxLength={50} /></label></div>
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-medium text-slate-200">Task color<span className="flex items-center gap-3 text-xs text-[#aebdb2]"><span>{color}</span><input aria-label="Task color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="size-8 cursor-pointer rounded-md border-0 bg-transparent p-0" /></span></label>
          {error && <p role="alert" className="rounded-xl bg-[#ff5151]/10 px-3 py-2 text-sm text-[#ffaaaa]">{error}</p>}
          <div className="flex justify-between gap-3 pt-2">{isEditing ? <button type="button" disabled={isSubmitting} onClick={handleDelete} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#ff9999] transition hover:bg-[#ff5151]/10 disabled:opacity-60">Delete task</button> : <span />}<div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#aebdb2] transition hover:bg-white/10">Cancel</button><button disabled={isSubmitting} className="rounded-xl bg-[#46ff96] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#8dffbd] disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Add to calendar"}</button></div></div>
        </form>
      </section>
    </div>
  );
}
