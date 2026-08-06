import React from "react";
import { motion } from "motion/react";
import { TreePine, Check } from "lucide-react";

const ORBS = [
  { size: "w-64 h-64", pos: "-top-20 -left-20", bg: "bg-white/10", anim: { y: [0, 30, 0], scale: [1, 1.1, 1] }, dur: 8 },
  { size: "w-48 h-48", pos: "top-1/3 -right-16", bg: "bg-white/5", anim: { y: [0, -40, 0], scale: [1, 1.15, 1] }, dur: 10 },
  { size: "w-32 h-32", pos: "bottom-20 left-1/3", bg: "bg-white/10", anim: { y: [0, -25, 0], x: [0, 15, 0] }, dur: 6 },
  { size: "w-56 h-56", pos: "-bottom-28 right-1/4", bg: "bg-white/5", anim: { scale: [1, 1.2, 1] }, dur: 7 },
];

const TREE_BARS = [4, 8, 16, 24, 34, 24, 16, 8, 4];

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function AuthLeftPanel({ heading, subtext, features, stats }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex-col justify-center px-16 xl:px-20"
    >
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {ORBS.map((orb, i) => (
          <motion.div
            key={i}
            className={`absolute ${orb.size} rounded-full ${orb.bg} ${orb.pos}`}
            animate={orb.anim}
            transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-lg">
        <motion.div variants={itemVariants} className="flex items-center gap-3 mb-10"
          initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg shadow-black/10">
            <TreePine className="w-9 h-9 text-white" />
          </div>
        </motion.div>

        <motion.h1 variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}
          className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">{heading}</motion.h1>

        <motion.p variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}
          className="text-lg text-white/80 leading-relaxed mb-10">{subtext}</motion.p>

        <motion.ul variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.5 }}
          className="space-y-4 mb-12">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/90 text-base">{feature}</span>
            </li>
          ))}
        </motion.ul>

        {stats && (
          <motion.p variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}
            className="text-white/60 text-sm mb-10">{stats}</motion.p>
        )}

        <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.7 }}
          className="flex items-end gap-2 opacity-40">
          {TREE_BARS.map((h, i) => (
            <motion.div key={i} className="w-3 bg-white dark:bg-slate-800 rounded-t-full"
              style={{ height: h }}
              animate={{ height: [h, h * 1.3, h] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
