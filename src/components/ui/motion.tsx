"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";

export { AnimatePresence, MotionConfig, motion };

export const softReveal = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.99 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

export const panelReveal = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};
