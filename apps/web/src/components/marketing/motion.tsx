"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.01, margin: "80px 0px 80px 0px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ArtFrame({ src, alt, cutout = false }: { src: string; alt: string; cutout?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className="relative overflow-hidden" style={{ perspective: 1200 }}>
      <motion.div
        className={cutout ? "" : "overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(47,91,255,0.18)]"}
        whileHover={reduce ? undefined : { rotateY: -6, rotateX: 4, scale: 1.015 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={cutout ? "block w-full mix-blend-multiply" : "block h-auto w-full"} />
      </motion.div>
    </motion.div>
  );
}
