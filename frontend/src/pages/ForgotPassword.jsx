import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import {
  TreePine, Mail, ArrowLeft, Send, Loader2, AlertCircle, MailCheck, RefreshCw,
  Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { authAPI } from "../services/api";
import AuthLeftPanel from "../components/AuthLeftPanel";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
});

const RESEND_COOLDOWN = 60;

const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } } };
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function ResendTimer({ cooldown, onResend, loading }) {
  const [countdown, setCountdown] = useState(cooldown);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const canResend = countdown <= 0;

  return (
    <button
      type="button"
      disabled={!canResend || loading}
      onClick={() => { onResend(); setCountdown(RESEND_COOLDOWN); }}
      className="btn btn-ghost btn-sm text-slate-500 dark:text-slate-300 gap-2 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      {canResend ? "Resend Email" : `Resend in ${countdown}s`}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = enter email, 2 = sent
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const onSubmit = useCallback(async (data) => {
    setIsSubmitting(true);
    try {
      await authAPI.forgotPassword(data.email);
      setEmail(data.email);
      setStep(2);
    } catch {
      toast.success("If the email is registered, a reset link has been sent.");
      setEmail(data.email);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleResend = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success("Email sent again! Check your inbox.");
    } catch {
      toast.success("Email sent again! Check your inbox.");
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);


  // ── STEP 1: Enter Email ───────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen flex">
        <AuthLeftPanel
          heading={<>Forgot your <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">password?</span></>}
          subtext="No worries! It happens to the best of us. We'll help you get back to your family tree in no time."
          features={[
            "Enter your registered email",
            "Check your inbox for a reset link",
            "Create a new strong password",
          ]}
        />

        <motion.div
          className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900 lg:bg-gradient-to-br lg:from-slate-50 lg:to-white lg:dark:from-slate-900 lg:dark:to-slate-950"
          initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden flex justify-center mb-8" variants={itemVariants}>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/20">
                <TreePine className="w-8 h-8 text-white" />
              </div>
            </div>

            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 mb-6 transition-colors" variants={itemVariants}>
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>

            <div variants={itemVariants}>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 dark:text-white">Forgot Password?</h2>
              <p className="text-slate-500 dark:text-slate-300 mt-2">Enter your email and we'll send you a link to reset your password.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-8">
              <div variants={itemVariants}>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")}
                    className={`w-full h-12 pl-11 pr-4 rounded-xl border-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:text-white transition-all duration-200 outline-none ${errors.email ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"}`} />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
              </div>

              <div variants={itemVariants}>
                <button type="submit" disabled={isSubmitting}
                  className="w-full h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.99] hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Sending link...</span></> : <><span>Send Reset Link</span><Send className="w-5 h-5" /></>}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-6 space-x-4" variants={itemVariants}>
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium hover:underline">Remember your password? Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── STEP 2: Email Sent ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel
        heading={<>Check your <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-100">inbox!</span></>}
        subtext="We've sent a magic link to your email. Click the link to reset your password and regain access to your family tree."
        features={[
          "Click the link in the email",
          "Create a new strong password",
          "Sign in and continue your journey",
        ]}
      />

      <motion.div
        className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-900 lg:bg-gradient-to-br lg:from-slate-50 lg:to-white lg:dark:from-slate-900 lg:dark:to-slate-950"
        initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="w-full max-w-[420px] text-center">
          {/* Animated mail icon */}
          <div variants={itemVariants}>
            <div className="inline-flex mx-auto mb-6 w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center relative">
              <MailCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 animate-ping opacity-20" />
            </div>
          </div>

          <div variants={itemVariants}>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 dark:text-white">Check your email</h2>
            <p className="text-slate-500 dark:text-slate-300 mt-3">We sent a password reset link to</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 dark:text-white mt-1">{email}</p>
          </div>

          {/* Info box */}
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-left" variants={itemVariants}>
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                The link will expire in <strong>15 minutes</strong> for security reasons.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 mt-6" variants={itemVariants}>
            <ResendTimer cooldown={RESEND_COOLDOWN} onResend={handleResend} loading={isSubmitting} />
          </div>

          <div variants={itemVariants}>
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 mt-4 transition-colors">
              Wrong email? Try again
            </button>
          </div>

          {/* Help section */}
          <div className="mt-8 border-t border-slate-200 dark:border-slate-600 pt-4" variants={itemVariants}>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 mx-auto transition-colors"
            >
              Didn&apos;t receive the email? {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showHelp && (
              <ul className="mt-3 text-left text-sm text-slate-500 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure the email address is correct</li>
                <li>• Add <span className="text-emerald-600">noreply@familytree.app</span> to your contacts</li>
                <li>• Still stuck? <span className="text-emerald-600 cursor-pointer hover:underline">Contact support</span></li>
              </ul>
            )}
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-6" variants={itemVariants}>
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium hover:underline">Back to login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
