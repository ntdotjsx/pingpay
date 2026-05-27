"use client";
import { motion } from "motion/react";

const paths = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  d: `M-${380 - i * 5} -${189 + i * 6}C-${380 - i * 5} -${189 + i * 6} -${312 - i * 5} ${216 - i * 6} ${152 - i * 5} ${343 - i * 6}C${616 - i * 5} ${470 - i * 6} ${684 - i * 5} ${875 - i * 6} ${684 - i * 5} ${875 - i * 6}`,
  width: 0.5 + i * 0.03,
  duration: 20 + Math.random() * 10, // คำนวณครั้งเดียวตอน module load
}));

export function FloatingPaths({ position }: { position: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-back" fill="none" viewBox="0 0 696 316">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={`M-${380 - path.id * 5 * position} -${189 + path.id * 6}C-${380 - path.id * 5 * position} -${189 + path.id * 6} -${312 - path.id * 5 * position} ${216 - path.id * 6} ${152 - path.id * 5 * position} ${343 - path.id * 6}C${616 - path.id * 5 * position} ${470 - path.id * 6} ${684 - path.id * 5 * position} ${875 - path.id * 6} ${684 - path.id * 5 * position} ${875 - path.id * 6}`}
            stroke="currentColor"
            strokeOpacity={0.1 + path.id * 0.03}
            strokeWidth={path.width}
            fill="none"
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration, // ✅ ค่าคงที่ ไม่ random ตอน render
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}