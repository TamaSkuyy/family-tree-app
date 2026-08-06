import React, { useMemo } from "react";
import { Check, X } from "lucide-react";

const CHECKS = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS = [
  { color: "bg-red-500", label: "Weak", pct: "20%" },
  { color: "bg-orange-500", label: "Fair", pct: "40%" },
  { color: "bg-yellow-500", label: "Good", pct: "60%" },
  { color: "bg-emerald-400", label: "Strong", pct: "80%" },
  { color: "bg-emerald-500", label: "Very strong", pct: "100%" },
];

export default function PasswordStrength({ password }) {
  const strength = useMemo(() => {
    let s = 0;
    for (const c of CHECKS) if (c.test(password)) s++;
    return s;
  }, [password]);

  const show = password.length > 0;
  const lvl = LEVELS[Math.max(0, strength - 1)] || LEVELS[0];
  const effectiveStrength = password.length === 0 ? 0 : Math.max(1, strength);

  return (
    <div
      className="mt-2 overflow-hidden transition-all duration-300"
      style={{ maxHeight: show ? "20rem" : "0", opacity: show ? 1 : 0 }}
    >
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= effectiveStrength ? lvl.color : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        Password strength:{" "}
        <span
          className={`font-medium ${
            strength >= 4 ? "text-emerald-600" : strength >= 2 ? "text-yellow-600" : "text-red-500"
          }`}
        >
          {lvl.label}
        </span>
      </p>

      <ul className="mt-2 space-y-1">
        {CHECKS.map((check) => {
          const passed = check.test(password);
          return (
            <li
              key={check.key}
              className="flex items-center gap-1.5 text-xs transition-colors duration-200"
              style={{ color: passed ? "#059669" : "#94a3b8" }}
            >
              {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
