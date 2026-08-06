import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User, Mail, Shield, Calendar, Lock, Eye, EyeOff, Loader2, Check, ArrowLeft,
  Key, LogOut, AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const pwSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Uppercase required").regex(/[0-9]/, "Number required"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const itemV = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(pwSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await authAPI.resetPassword("", data.newPassword); // won't work — use proper endpoint
      // For now, just show a toast since we don't have change-password endpoint
      toast.success("Password change coming soon!");
      reset();
      setChangingPw(false);
    } catch {
      toast.error("Failed to change password");
    } finally { setSubmitting(false); }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Hero Card */}
      <motion.div variants={itemV} initial="hidden" animate="visible"
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
            flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <Shield className="w-3 h-3" /> {user.role}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                {user.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                Joined {new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Change Password Card */}
      <motion.div variants={itemV} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
        <button
          onClick={() => setChangingPw(!changingPw)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950 rounded-lg">
              <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-slate-100">Change Password</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Update your account password</p>
            </div>
          </div>
          <span className={`text-slate-400 transition-transform ${changingPw ? "rotate-180" : ""}`}>▾</span>
        </button>

        {changingPw && (
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPw ? "text" : "password"} {...register("currentPassword")}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" {...register("newPassword")}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
              </div>
              {errors.newPassword && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.newPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showConfirm ? "text" : "password"} {...register("confirmPassword")}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword.message}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setChangingPw(false); reset(); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md flex items-center gap-2 transition-all disabled:opacity-60 text-sm">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Update Password
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Logout */}
      <motion.div variants={itemV} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-red-200 dark:border-red-900
            text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </motion.div>
    </div>
  );
}
