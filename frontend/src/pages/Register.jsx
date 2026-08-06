import React, { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  TreePine, User, Mail, Lock, Eye, EyeOff, UserPlus, Github,
  Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { authAPI } from "../services/api";
import AuthLeftPanel from "../components/AuthLeftPanel";
import PasswordStrength from "../components/PasswordStrength";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms of Service" }) }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const FEATURES = [
  "Build unlimited family trees",
  "Invite family members to collaborate",
  "Store photos and memories",
  "Private & secure by default",
];


// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);


// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", terms: false },
  });

  const passwordValue = watch("password");

  const onSubmit = useCallback(async (data) => {
    setIsSubmitting(true);
    try {
      const res = await authAPI.register(data);
      const token = res?.data?.data?.token;
      if (token) {
        localStorage.setItem("ft_token", token);
        await login({ email: data.email, password: data.password });
      }
      toast.success("Account created! Welcome to Family Tree 🎉", {
        description: "Redirecting you to your dashboard...",
      });
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setShakeKey((k) => k + 1);
      toast.error("Registration failed", {
        description: err?.response?.data?.error || "Please check your information and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [login, navigate]);

  const formAnim = (delay) => ({ animation: `fadeInUp 0.5s ${delay}s both` });

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <AuthLeftPanel
        heading={
          <>Start Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">Family Journey</span>
          </>
        }
        subtext="Join thousands of families preserving their heritage and creating beautiful family trees together."
        features={FEATURES}
        stats="10,000+ Families  •  50,000+ Members  •  100+ Countries"
      />

      {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12
          bg-white dark:bg-slate-900
          lg:bg-gradient-to-br lg:from-slate-50 lg:to-white
          lg:dark:from-slate-900 lg:dark:to-slate-950"
        style={{ animation: "slideFromRight 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both" }}
      >
        <div className="w-full max-w-[460px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8" style={{ animation: "fadeInUp 0.5s both" }}>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/20">
              <TreePine className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8" style={{ animation: "fadeInUp 0.5s 0.1s both" }}>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create your account</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Start building your family tree in minutes</p>
          </div>

          {/* Form */}
          <form
            key={shakeKey}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Name */}
            <div style={formAnim(0.2)}>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="name" type="text" autoComplete="name" placeholder="John Doe" {...register("name")}
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 outline-none ${errors.name ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"}`} />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div style={formAnim(0.3)}>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")}
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 outline-none ${errors.email ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"}`} />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={formAnim(0.4)}>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a strong password" {...register("password")}
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 outline-none ${errors.password ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"}`} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordStrength password={passwordValue} />
              {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div style={formAnim(0.5)}>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" {...register("confirmPassword")}
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 outline-none ${errors.confirmPassword ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"}`} />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}>
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword.message}</p>}
            </div>

            {/* Terms */}
            <div style={formAnim(0.6)}>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" {...register("terms")}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500/20 checked:bg-emerald-600 cursor-pointer" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  I agree to the{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer hover:underline">Terms of Service</span>
                  {" "}and{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer hover:underline">Privacy Policy</span>
                </span>
              </label>
              {errors.terms && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.terms.message}</p>}
            </div>

            {/* Submit */}
            <div style={formAnim(0.7)}>
              <button type="submit" disabled={isSubmitting}
                className="w-full h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.99] hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Creating your account...</span></>
                  : <><span>Create Account</span><UserPlus className="w-5 h-5" /></>}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6" style={{ animation: "fadeInUp 0.5s 0.75s both" }}>
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">Or sign up with</span>
            </div>
          </div>

          {/* Social Sign Up */}
          <div className="grid grid-cols-2 gap-3" style={{ animation: "fadeInUp 0.5s 0.85s both" }}>
            {[{ icon: <GoogleIcon />, label: "Google" }, { icon: <Github className="w-5 h-5" />, label: "GitHub" }].map((btn) => (
              <button key={btn.label} type="button"
                onClick={() => toast.info(`${btn.label} sign-up coming soon!`, { description: "We're working on social login integration." })}
                className="w-full h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.98] hover:scale-[1.02] transition-all duration-200 text-sm font-medium">
                {btn.icon}<span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6" style={{ animation: "fadeInUp 0.5s 0.95s both" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline underline-offset-2 transition-all">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
