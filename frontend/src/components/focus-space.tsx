"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Coffee, Flame, Grip, ImagePlus, Palette, Pause, Pencil, Play, Plus, RotateCcw, Settings2, Sparkles, Trash2, Video } from "lucide-react";
import { type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { createFocusSession, createSubtask, getDailyFocusSummary, getSubtasks, updateSubtaskCompletion } from "@/lib/api";
import { CelebrationBurst } from "@/components/celebration-burst";
import type { Subtask } from "@/types/subtask";
import type { Task } from "@/types/task";

interface FocusSpaceProps {
  task: Task;
  onExit: () => void;
  onUpdateCompletion: (isCompleted: boolean) => Promise<void>;
  onEdit: () => void;
}

interface DraggableWidgetProps {
  anchorClassName: string;
  children: ReactNode;
  label: string;
}

type TimerMode = "work" | "short_break" | "long_break";
type Vibe = "forest" | "ember" | "night";

function formatRemaining(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function withAlpha(hexColor: string, alpha: string): string {
  return `${hexColor}${alpha}`;
}

function getYouTubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? null;
  } catch { return null; }
  return null;
}

function DraggableWidget({ anchorClassName, children, label }: DraggableWidgetProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.offsetX + event.clientX - dragStart.current.x,
      y: dragStart.current.offsetY + event.clientY - dragStart.current.y,
    });
  }

  return (
    <section className={`fixed z-30 ${anchorClassName}`} style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}>
      <div onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { dragStart.current = null; }} className="flex cursor-grab touch-none items-center gap-2 rounded-t-[1.4rem] border border-b-0 border-white/10 bg-black/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ba79e] backdrop-blur-md active:cursor-grabbing" aria-label={`Drag ${label} anywhere in the room`}><Grip size={14} className="text-[#46ff96]" /> Drag {label}</div>
      {children}
    </section>
  );
}

export function FocusSpace({ task, onExit, onUpdateCompletion, onEdit }: FocusSpaceProps) {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [timerMode, setTimerMode] = useState<TimerMode>("work");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [focusedToday, setFocusedToday] = useState(0);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [isSavingSubtask, setIsSavingSubtask] = useState(false);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [vibe, setVibe] = useState<Vibe>("forest");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [videoVolume, setVideoVolume] = useState(45);
  const [error, setError] = useState<string | null>(null);
  const [subtaskCelebration, setSubtaskCelebration] = useState(0);
  const [subtaskCelebrationOrigin, setSubtaskCelebrationOrigin] = useState<{ x: number; y: number } | null>(null);
  const [taskCelebration, setTaskCelebration] = useState(0);
  const unloggedWorkSeconds = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const todayKey = new Date().toLocaleDateString("en-CA");

  const resetTimer = useCallback((mode: TimerMode = timerMode) => {
    const minutes = mode === "work" ? workMinutes : mode === "short_break" ? shortBreakMinutes : longBreakMinutes;
    setTimerMode(mode);
    setRemainingSeconds(minutes * 60);
    setIsRunning(false);
  }, [longBreakMinutes, shortBreakMinutes, timerMode, workMinutes]);

  const recordWorkSeconds = useCallback(async (seconds: number, isFullPomodoro: boolean) => {
    if (seconds < 1) return;
    await createFocusSession({ task_id: task.id, focused_on: todayKey, duration_seconds: seconds, is_full_pomodoro: isFullPomodoro });
    setFocusedToday((minutes) => minutes + seconds / 60);
  }, [task.id, todayKey]);

  const finishTimerPhase = useCallback(async () => {
    setIsRunning(false);
    if (timerMode !== "work") {
      resetTimer("work");
      return;
    }
    try {
      const seconds = unloggedWorkSeconds.current || workMinutes * 60;
      unloggedWorkSeconds.current = 0;
      await recordWorkSeconds(seconds, true);
      const nextPomodoroCount = completedPomodoros + 1;
      setCompletedPomodoros(nextPomodoroCount);
      resetTimer(nextPomodoroCount % 4 === 0 ? "long_break" : "short_break");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Orbit could not save this focus session.");
      resetTimer("work");
    }
  }, [completedPomodoros, recordWorkSeconds, resetTimer, timerMode, workMinutes]);

  useEffect(() => {
    let isCurrent = true;
    getSubtasks(task.id).then((items) => { if (isCurrent) setSubtasks(items); }).catch(() => { if (isCurrent) setError("Orbit could not load this task's subtasks."); });
    return () => { isCurrent = false; };
  }, [task.id]);

  useEffect(() => {
    getDailyFocusSummary(todayKey, 1).then((summary) => {
      const today = summary[0];
      setCompletedPomodoros(today?.completed_pomodoros ?? 0);
      setFocusedToday(today?.focused_minutes ?? 0);
    }).catch(() => { /* Focus stats should not block the room. */ });
  }, [todayKey]);

  useEffect(() => {
    if (!isRunning || remainingSeconds === 0) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (timerMode === "work") unloggedWorkSeconds.current += 1;
        if (next === 0) window.setTimeout(() => { void finishTimerPhase(); }, 0);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finishTimerPhase, isRunning, remainingSeconds, timerMode]);

  const currentDuration = timerMode === "work" ? workMinutes : timerMode === "short_break" ? shortBreakMinutes : longBreakMinutes;
  const progress = ((currentDuration * 60 - remainingSeconds) / (currentDuration * 60)) * 100;
  const completedSubtasks = subtasks.filter((subtask) => subtask.is_completed).length;
  const subtaskProgress = subtasks.length ? (completedSubtasks / subtasks.length) * 100 : 0;
  const accent = task.color;
  const vibeBackgrounds: Record<Vibe, string> = {
    forest: `radial-gradient(ellipse at 15% 15%, ${withAlpha(accent, "45")}, transparent 28%), radial-gradient(ellipse at 85% 82%, rgba(255,48,48,.22), transparent 27%), linear-gradient(135deg, var(--focus-a), var(--focus-b) 48%, var(--focus-c))`,
    ember: `radial-gradient(ellipse at 20% 15%, ${withAlpha(accent, "36")}, transparent 30%), radial-gradient(ellipse at 80% 75%, rgba(255,83,45,.24), transparent 30%), linear-gradient(135deg, var(--focus-c), var(--focus-b) 48%, var(--focus-a))`,
    night: `radial-gradient(ellipse at 18% 18%, ${withAlpha(accent, "34")}, transparent 30%), radial-gradient(ellipse at 82% 76%, rgba(90,110,255,.20), transparent 28%), linear-gradient(135deg, var(--focus-a), var(--focus-b) 50%, var(--focus-c))`,
  };

  async function toggleTaskCompletion() {
    setError(null);
    setIsSavingCompletion(true);
    try { await onUpdateCompletion(!task.is_completed); if (!task.is_completed) setTaskCelebration((signal) => signal + 1); }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not update that task."); }
    finally { setIsSavingCompletion(false); }
  }

  async function toggleTimer() {
    if (isRunning) {
      setIsRunning(false);
      if (timerMode === "work") {
        const seconds = unloggedWorkSeconds.current;
        unloggedWorkSeconds.current = 0;
        try { await recordWorkSeconds(seconds, false); }
        catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not save this focus time."); }
      }
      return;
    }
    setIsRunning(true);
  }

  async function resetCurrentTimer() {
    if (timerMode === "work") {
      const seconds = unloggedWorkSeconds.current;
      unloggedWorkSeconds.current = 0;
      try { await recordWorkSeconds(seconds, false); }
      catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not save this focus time."); }
    }
    resetTimer(timerMode);
  }

  async function exitFocusRoom() {
    await resetCurrentTimer();
    onExit();
  }

  async function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newSubtask.trim();
    if (!title) return;
    setError(null);
    setIsSavingSubtask(true);
    try { const created = await createSubtask(task.id, title); setSubtasks((items) => [...items, created]); setNewSubtask(""); }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not create that subtask."); }
    finally { setIsSavingSubtask(false); }
  }

  async function toggleSubtask(subtask: Subtask, event: ReactMouseEvent<HTMLButtonElement>) {
    setError(null);
    const checkmark = event.currentTarget.querySelector<HTMLElement>("[data-subtask-check]");
    const rect = (checkmark ?? event.currentTarget).getBoundingClientRect();
    const celebrationOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    try { const updated = await updateSubtaskCompletion(subtask.id, !subtask.is_completed); setSubtasks((items) => items.map((item) => item.id === updated.id ? updated : item)); if (updated.is_completed && !subtask.is_completed) { setSubtaskCelebrationOrigin(celebrationOrigin); setSubtaskCelebration((signal) => signal + 1); } }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : "Orbit could not update that subtask."); }
  }

  function selectWallpaper(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file for the wallpaper."); return; }
    setWallpaper(URL.createObjectURL(file));
    setYoutubeId(null);
  }

  function applyYouTubeBackground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = getYouTubeId(youtubeUrl.trim());
    if (!id) { setError("Paste a valid YouTube or youtu.be video link."); return; }
    setError(null);
    setYoutubeId(id);
    setWallpaper(null);
  }

  function applyYouTubePreset(url: string) {
    const id = getYouTubeId(url);
    if (!id) return;
    setYoutubeUrl(url);
    setYoutubeId(id);
    setWallpaper(null);
  }

  function updateVideoVolume(volume: number) {
    setVideoVolume(volume);
    const player = document.getElementById("orbit-youtube-player") as HTMLIFrameElement | null;
    player?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [volume] }), "*");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030504] px-4 py-5 text-[#f4fff7] sm:px-8">
      <CelebrationBurst kind="step" signal={subtaskCelebration} origin={subtaskCelebrationOrigin} />
      <CelebrationBurst kind="task_done" signal={taskCelebration} />
      {youtubeId && <iframe id="orbit-youtube-player" title="YouTube focus ambience" onLoad={() => updateVideoVolume(videoVolume)} className="absolute inset-0 size-full scale-110 opacity-80" src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&controls=1&rel=0&enablejsapi=1`} allow="autoplay; encrypted-media; picture-in-picture" />}
      {wallpaper && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${wallpaper})` }} />}
      <div className="pointer-events-none absolute inset-0" style={{ background: wallpaper || youtubeId ? "var(--focus-media-overlay)" : vibeBackgrounds[vibe] }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,.75)_0.55px,transparent_0.55px)] [background-size:5px_5px]" />

      <header className="relative z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><button onClick={() => { void exitFocusRoom(); }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-sm text-[#d5e3d9] backdrop-blur-md transition hover:border-[#46ff96]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-[#46ff96]"><ArrowLeft size={16} /> Return to calendar</button><button onClick={onEdit} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-[#d5e3d9] backdrop-blur-md transition hover:border-[#46ff96]/50 hover:text-white"><Pencil size={15} /> Edit</button></div>
        <div className="flex items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-sm text-[#d5e3d9] backdrop-blur-md transition hover:border-[#46ff96]/50 hover:text-white"><ImagePlus size={16} className="text-[#46ff96]" /> Add wallpaper<input onChange={selectWallpaper} accept="image/*" type="file" className="sr-only" /></label><details className="relative"><summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-sm text-[#d5e3d9] backdrop-blur-md hover:border-[#46ff96]/50"><Palette size={16} /> Vibe</summary><div className="absolute right-0 top-12 w-72 rounded-2xl border border-white/10 bg-[#080b08]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#9bad9f]">Room palette</p><div className="mt-3 grid grid-cols-3 gap-2">{(["forest", "ember", "night"] as Vibe[]).map((item) => <button key={item} onClick={() => setVibe(item)} className={`rounded-xl border px-2 py-2 text-xs capitalize ${vibe === item ? "border-[#46ff96] bg-[#46ff96]/10 text-[#9cffc5]" : "border-white/10 text-[#b8c6bc]"}`}>{item}</button>)}</div><form onSubmit={applyYouTubeBackground} className="mt-4 border-t border-white/10 pt-3"><label className="text-xs font-bold text-[#d8e4db]"><Video size={14} className="mr-1 inline text-[#ff5151]" />YouTube ambience</label><input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="Paste a YouTube link" className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none placeholder:text-[#6e7e73] focus:border-[#46ff96]" /><button className="mt-2 w-full rounded-xl bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/15">Use video background</button><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => applyYouTubePreset("https://youtu.be/DvfSPb8VWC4?si=PloUljqrPTqRng6T")} className="rounded-lg border border-white/10 px-2 py-2 text-[10px] text-[#b8c6bc] hover:border-[#46ff96]/50">Lofi flow</button><button type="button" onClick={() => applyYouTubePreset("https://www.youtube.com/live/Q89Dzox4jAE?si=_hC9spQhp7046esh")} className="rounded-lg border border-white/10 px-2 py-2 text-[10px] text-[#b8c6bc] hover:border-[#46ff96]/50">Live ambience</button></div>{youtubeId && <label className="mt-3 block text-xs font-bold text-[#d8e4db]">Video volume <span className="float-right text-[#8dffbb]">{videoVolume}%</span><input type="range" min="0" max="100" value={videoVolume} onChange={(event) => updateVideoVolume(Number(event.target.value))} className="mt-2 w-full accent-[#46ff96]" /></label>}<p className="mt-2 text-[10px] leading-4 text-[#839087]">If sound does not start, click the video area. Embed availability depends on the video.</p></form></div></details>{(wallpaper || youtubeId) && <button onClick={() => { setWallpaper(null); setYoutubeId(null); }} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/35 text-[#ff8b8b] backdrop-blur-md hover:border-[#ff5151]" aria-label="Remove custom background"><Trash2 size={16} /></button>}</div>
      </header>

      <motion.section initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }} className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl flex-col items-center justify-center py-24 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-[0.18em]" style={{ borderColor: withAlpha(accent, "66"), backgroundColor: withAlpha(accent, "1f"), color: accent }}><Sparkles size={14} /> MAKE THIS MOMENT COUNT</span>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ff8b8b]">{task.category} / {task.priority.replace("_", " ")}</p>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white drop-shadow-2xl sm:text-7xl">{task.title}</h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-[#d1ded4]">One task. One room. One honest promise to yourself.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3"><button onClick={() => { void toggleTimer(); }} style={{ backgroundColor: accent, boxShadow: `0 18px 36px ${withAlpha(accent, "33")}` }} className="inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-bold text-black transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2" >{isRunning ? <Pause size={18} /> : <Play size={18} />}{isRunning ? "Pause the moment" : "Begin focus"}</button><button onClick={toggleTaskCompletion} disabled={isSavingCompletion} style={task.is_completed ? { borderColor: accent, backgroundColor: withAlpha(accent, "26"), color: accent } : undefined} className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 font-bold transition disabled:opacity-60 ${task.is_completed ? "" : "border-white/15 bg-black/25 text-white hover:border-white/45"}`}><Check size={18} /> {isSavingCompletion ? "Saving..." : task.is_completed ? "Promise kept" : "Mark promise kept"}</button></div>
        <div className="mt-8 flex flex-wrap justify-center gap-2"><div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-[#c4d1c8] backdrop-blur"><span className="font-bold" style={{ color: accent }}>{completedSubtasks}</span> / {subtasks.length} focus steps completed</div><div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-[#c4d1c8] backdrop-blur"><span className="font-bold text-[#46ff96]">{Math.round(focusedToday)}</span> focused minutes today</div></div>
        <p className="mt-10 text-xs text-[#a1afa5]">Drag both widgets anywhere in the room. Your wallpaper stays active for this session.</p>
      </motion.section>

      <DraggableWidget label="timer" anchorClassName="right-5 top-24 w-80 sm:right-8">
        <div className="rounded-b-[1.4rem] border border-white/10 bg-[#071109]/90 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl"><div className="mb-3 flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9bad9f]">{timerMode === "work" ? <Flame size={14} className="text-[#ff7676]" /> : <Coffee size={14} className="text-[#69a8ff]" />}{timerMode.replace("_", " ")}</span><div className="flex items-center gap-1" aria-label={`${completedPomodoros} pomodoros completed today`}>{Array.from({ length: Math.min(completedPomodoros, 6) }, (_, index) => <Flame key={index} size={13} style={{ color: accent }} fill={accent} />)}{completedPomodoros > 6 && <span className="ml-1 text-xs text-[#d8e4db]">+{completedPomodoros - 6}</span>}{completedPomodoros === 0 && <span className="text-xs text-[#6e7e73]">0 today</span>}</div></div><div className="grid place-items-center"><div className="grid size-40 place-items-center rounded-full p-2" style={{ background: `conic-gradient(${accent} ${progress}%, rgba(255,255,255,.10) ${progress}%)` }}><div className="grid size-full place-items-center rounded-full bg-[#071109]"><span className="font-mono text-4xl font-semibold tracking-[-0.09em] text-white">{formatRemaining(remainingSeconds)}</span><span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9bad9f]">{timerMode === "work" ? "deep work" : "restore"}</span></div></div></div><div className="mt-4 grid grid-cols-3 gap-2"><button onClick={() => { void toggleTimer(); }} style={{ backgroundColor: accent }} className="inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-bold text-black hover:brightness-110">{isRunning ? <Pause size={15} /> : <Play size={15} />}{isRunning ? "Pause" : "Start"}</button><button onClick={() => { void resetCurrentTimer(); }} className="rounded-xl border border-white/10 text-[#d8e4db] hover:bg-white/[0.06]" aria-label="Reset timer"><RotateCcw size={16} className="mx-auto" /></button><span className="grid place-items-center rounded-xl bg-[#ff5151]/10 text-xs font-bold text-[#ff9898]">{currentDuration}:00</span></div><div className="mt-4 border-t border-white/10 pt-3"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#9bad9f]"><Settings2 size={13} /> Session lengths</div><div className="grid grid-cols-3 gap-2"><label className="text-[10px] text-[#9bad9f]">Work<input min="1" max="120" type="number" value={workMinutes} onChange={(event) => setWorkMinutes(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[#46ff96]" /></label><label className="text-[10px] text-[#9bad9f]">Short<input min="1" max="60" type="number" value={shortBreakMinutes} onChange={(event) => setShortBreakMinutes(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[#46ff96]" /></label><label className="text-[10px] text-[#9bad9f]">Long<input min="1" max="90" type="number" value={longBreakMinutes} onChange={(event) => setLongBreakMinutes(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-sm text-white outline-none focus:border-[#46ff96]" /></label></div><button onClick={() => { void resetCurrentTimer(); }} className="mt-2 w-full rounded-lg border border-white/10 py-2 text-xs font-semibold text-[#d8e4db] hover:bg-white/[0.06]">Apply and reset work timer</button></div></div>
      </DraggableWidget>

      <DraggableWidget label="focus steps" anchorClassName="bottom-5 left-5 w-[min(22rem,calc(100vw-2.5rem))] sm:bottom-8 sm:left-8">
        <div className="rounded-b-[1.4rem] border border-white/10 bg-[#090b0a]/90 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Session breakdown</h2><div className="grid size-10 place-items-center rounded-full p-1" style={{ background: `conic-gradient(${accent} ${subtaskProgress}%, rgba(255,255,255,.12) ${subtaskProgress}%)` }}><span className="grid size-full place-items-center rounded-full bg-[#090b0a] text-[10px] font-bold text-white">{completedSubtasks}/{subtasks.length}</span></div></div><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${subtaskProgress}%`, backgroundColor: accent }} /></div><div className="max-h-48 space-y-1 overflow-y-auto pr-1">{subtasks.length === 0 && <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-[#9bad9f]">Break the task into one small next action.</p>}{subtasks.map((subtask) => <button key={subtask.id} onClick={(event) => { void toggleSubtask(subtask, event); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.06]"><span data-subtask-check className={`grid size-5 shrink-0 place-items-center rounded-md border ${subtask.is_completed ? "border-[#46ff96] bg-[#46ff96] text-black" : "border-white/25"}`}>{subtask.is_completed && <Check size={13} strokeWidth={3} />}</span><span className={`text-sm ${subtask.is_completed ? "text-[#7e8c82] line-through" : "text-[#effaf1]"}`}>{subtask.title}</span></button>)}</div><form onSubmit={addSubtask} className="mt-3 flex gap-2 border-t border-white/10 pt-3"><label className="sr-only" htmlFor="subtask-title">Add a focus step</label><input id="subtask-title" value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} maxLength={200} placeholder="Add a focus step" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#6e7e73] focus:border-[#46ff96]" /><button disabled={isSavingSubtask} className="grid size-10 place-items-center rounded-xl bg-[#46ff96] text-black hover:bg-[#8dffbd] disabled:opacity-60" aria-label="Add focus step"><Plus size={18} /></button></form></div>
      </DraggableWidget>
      {error && <p role="alert" className="fixed bottom-5 left-1/2 z-40 max-w-sm -translate-x-1/2 rounded-xl border border-[#ff5151]/30 bg-[#310808]/95 px-4 py-3 text-sm text-[#ffb0b0]">{error}</p>}
    </main>
  );
}
