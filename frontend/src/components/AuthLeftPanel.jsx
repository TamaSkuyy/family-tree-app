import React from "react";
import { TreePine, Check } from "lucide-react";

const ORBS = [
  { size: "w-64 h-64", pos: "-top-20 -left-20", bg: "bg-white/10", anim: "animate-float-slow" },
  { size: "w-48 h-48", pos: "top-1/3 -right-16", bg: "bg-white/5", anim: "animate-float-slower" },
  { size: "w-32 h-32", pos: "bottom-20 left-1/3", bg: "bg-white/10", anim: "animate-float-medium" },
  { size: "w-56 h-56", pos: "-bottom-28 right-1/4", bg: "bg-white/5", anim: "animate-pulse-slow" },
];

const TREE_BARS = [4, 8, 16, 24, 34, 24, 16, 8, 4];

export default function AuthLeftPanel({ heading, subtext, features, stats }) {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden
        bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700
        flex-col justify-center px-16 xl:px-20"
      style={{ animation: "slideFromLeft 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both" }}
    >
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {ORBS.map((orb, i) => (
          <div key={i} className={`absolute ${orb.size} rounded-full ${orb.bg} ${orb.pos} ${orb.anim}`} />
        ))}
      </div>

      <div className="relative z-10 max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10" style={{ animation: "fadeInUp 0.5s 0.3s both" }}>
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg shadow-black/10">
            <TreePine className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6"
          style={{ animation: "fadeInUp 0.5s 0.4s both" }}
        >
          {heading}
        </h1>

        {/* Subtext */}
        <p
          className="text-lg text-white/80 leading-relaxed mb-10"
          style={{ animation: "fadeInUp 0.5s 0.5s both" }}
        >
          {subtext}
        </p>

        {/* Features */}
        <ul className="space-y-4 mb-12" style={{ animation: "fadeInUp 0.5s 0.6s both" }}>
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/90 text-base">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Stats */}
        {stats && (
          <p
            className="text-white/60 text-sm mb-10"
            style={{ animation: "fadeInUp 0.5s 0.7s both" }}
          >
            {stats}
          </p>
        )}

        {/* Decorative tree */}
        <div className="flex items-end gap-2 opacity-40" style={{ animation: "fadeInUp 0.5s 0.8s both" }}>
          {TREE_BARS.map((h, i) => (
            <div
              key={i}
              className="w-3 bg-white rounded-t-full animate-pulse-slow"
              style={{ height: h, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
