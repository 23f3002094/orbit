"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type CelebrationKind = "welcome" | "task" | "step";

interface CelebrationBurstProps {
  kind: CelebrationKind;
  signal: number;
  origin?: { x: number; y: number } | null;
}

const content: Record<CelebrationKind, { emojis: string[]; message: string; detail: string }> = {
  welcome: { emojis: ["☀️", "✨", "🎯", "🟠", "⚡"], message: "Your orbit is ready.", detail: "Choose one honest thing to move forward today." },
  task: { emojis: ["✨", "🎯", "⚡", "🟠", "🌟"], message: "Task locked in.", detail: "A future you just got some breathing room." },
  step: { emojis: ["✨", "⚡", "🌟", "🙌", "🟠"], message: "Step complete.", detail: "Keep the momentum warm." },
};

const trajectories = [
  { x: -130, y: -85, rotate: -24 },
  { x: -58, y: -140, rotate: 18 },
  { x: 25, y: -120, rotate: -12 },
  { x: 112, y: -78, rotate: 28 },
  { x: 150, y: -12, rotate: -18 },
];

export function CelebrationBurst({ kind, signal, origin }: CelebrationBurstProps) {
  const [dismissedSignal, setDismissedSignal] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const celebration = content[kind];
  const visible = signal !== 0 && dismissedSignal !== signal;

  useEffect(() => {
    if (!signal) return;
    const timeout = window.setTimeout(() => setDismissedSignal(signal), 1_650);
    return () => window.clearTimeout(timeout);
  }, [signal]);

  const wrapperClass = origin ? "absolute" : "relative rounded-3xl border border-[#ff9f43]/40 bg-[#160a05]/90 px-6 py-4 text-center shadow-2xl shadow-[#ff9f43]/20 backdrop-blur-xl";

  return <AnimatePresence>{visible && <div className="pointer-events-none fixed inset-0 z-[80] grid place-items-center" aria-live="polite">
    <motion.div initial={prefersReducedMotion ? false : { opacity: 0, scale: .88, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96, y: -8 }} transition={{ type: "spring", stiffness: 330, damping: 22 }} className={wrapperClass} style={origin ? { left: origin.x, top: origin.y } : undefined}>
      {!origin && <><p className="text-lg font-semibold text-white">{celebration.message}</p><p className="mt-1 text-sm text-[#ffd1a8]">{celebration.detail}</p></>}
      {celebration.emojis.map((emoji, index) => <motion.span key={`${signal}-${emoji}-${index}`} initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: .4, x: 0, y: 0 }} animate={prefersReducedMotion ? { opacity: 1 } : { opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, .8], x: trajectories[index].x, y: trajectories[index].y, rotate: trajectories[index].rotate }} transition={{ duration: prefersReducedMotion ? .2 : 1.35, delay: index * .055 }} className="absolute left-1/2 top-1/2 text-2xl">{emoji}</motion.span>)}
    </motion.div>
  </div>}</AnimatePresence>;
}
