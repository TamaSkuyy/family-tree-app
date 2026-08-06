import React, { useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  TreePine, Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle,
  AlertTriangle, ArrowRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "../services/api";
import AuthLeftPanel from "../components/AuthLeftPanel";
import PasswordStrength from "../components/PasswordStrength";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const resetSchema = z.object({
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "One uppercase letter")
    .regex(/[a-z]/, "One lowercase letter")
    .regex(/[0-9]/, "One number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [step, setStep] = useState("form"); // "form" | "success" | "invalid"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");

  const onSubmit = useCallback(async (data) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await authAPI.resetPassword(token, data.password);
      toast.success("Password reset successfully!", {
        description: "You can now sign in with your new password.",
      });
      setStep("success");
    } catch (err) {
      if (err?.response?.status === 400) {
        setStep("invalid");
      } else {
        toast.error("Reset failed", {
          description: err?.response?.data?.error || "Please try again later.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  const anim = (d) => ({ animation: `fadeInUp 0.5s ${d}s both` });

  // ── Invalid token ──────────────────────────────────────────────────
  if (step === "invalid") {
    return (
      <div className="min-h-screen flex">
        <AuthLeftPanel
          heading={<>Link <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">expired</span></>}
          subtext="This password reset link is no longer valid. Don't worry — you can request a new one in just a few seconds."
          features={["Links expire after 15 minutes", "Request a new link below", "Use it immediately"]}
        />

        <div
          className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900 lg:bg-gradient-to-br lg:from-slate-50 lg:to-white lg:dark:from-slate-900 lg:dark:to-slate-950"
          style={{ animation: "slideFromRight 0.7s both" }}
        >
          <div className="w-full max-w-[420px] text-center">
            <div style={anim(0.1)}>
              <div className="inline-flex mx-auto mb-6 w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div style={anim(0.2)}>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Link expired or invalid</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-3">This password reset link has expired or is invalid. Please request a new one.</p>
            </div>
            <div style={anim(0.35)} className="mt-8">
              <Link to="/forgot-password"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all">
                <RefreshCw className="w-5 h-5" /> Request new link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen flex">
        <AuthLeftPanel
          heading={<>All <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">set!</span></>}
          subtext="Your password has been reset successfully. You can now sign in with your new password and continue building your family tree."
          features={["Password updated securely", "All devices signed out", "Sign in with new password"]}
        />

        <div
          className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900 lg:bg-gradient-to-br lg:from-slate-50 lg:to-white lg:dark:from-slate-900 lg:dark:to-slate-950"
          style={{ animation: "slideFromRight 0.7s both" }}
        >
          <div className="w-full max-w-[420px] text-center">
            <div style={anim(0.1)}>
              <div className="inline-flex mx-auto mb-6 w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div style={anim(0.2)}>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Password Reset!</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-3">Your password has been successfully reset. You can now sign in with your new password.</p>
            </div>
            <div style={anim(0.35)} className="mt-8">
              <Link to="/login"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all">
                Continue to Login <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-sm text-slate-400 mt-4" style={anim(0.45)}>
              Redirecting to login shortly...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Reset Password Form ────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex">
        <AuthLeftPanel
          heading={<>Invalid <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">link</span></>}
          subtext="No reset token was provided. Please use the link from your email."
          features={[]}
        />
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">No reset token provided</h2>
            <Link to="/forgot-password" className="text-emerald-600 hover:underline mt-4 inline-block">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel
        heading={<>Create a new <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">password</span></>}
        subtext="Make sure it's strong and memorable. Your family tree security matters."
        features={[
          "Use at least 8 characters",
          "Mix uppercase & lowercase",
          "Include numbers & symbols",
          "Avoid common passwords",
        ]}
      />

      <div
        className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900 lg:bg-gradient-to-br lg:from-slate-50 lg:to-white lg:dark:from-slate-900 lg:dark:to-slate-950"
        style={{ animation: "slideFromRight 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) both" }}
      >
        <div className="w-full max-w-[460px]">
          <div className="lg:hidden flex justify-center mb-8" style={anim(0)}>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/20">
              <TreePine className="w-8 h-8 text-white" />
            </div>
          </div>

          <div style={anim(0.1)}>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create new password</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Your new password must be different from previous passwords.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-8">
            {/* New Password */}
            <div style={anim(0.2)}>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
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
            <div style={anim(0.3)}>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input id="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your new password" {...register("confirmPassword")}
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 outline-none ${errors.confirmPassword ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"}`} />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}>
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword.message}</p>}
            </div>

            {/* Security note */}
            <div style={anim(0.4)} className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                After resetting, you&apos;ll be logged out from all devices for security.
              </p>
            </div>

            <div style={anim(0.5)}>
              <button type="submit" disabled={isSubmitting}
                className="w-full h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.99] hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Resetting password...</span></> : <><span>Reset Password</span><CheckCircle2 className="w-5 h-5" /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
