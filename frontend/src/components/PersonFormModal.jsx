import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { User, Mail, Phone, FileText, Loader2, X, Check, Calendar } from "lucide-react";
import { personAPI } from "../services/api";
import toast from "react-hot-toast";

const personSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female"]),
  birth_date: z.string().optional(),
  death_date: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export default function PersonFormModal({ person, onClose, onSaved }) {
  const isEdit = !!person;
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(personSchema),
    defaultValues: {
      first_name: "", last_name: "", gender: "male",
      birth_date: "", death_date: "", email: "", phone: "", notes: "",
    },
  });

  useEffect(() => {
    if (person) {
      reset({
        first_name: person.first_name || "",
        last_name: person.last_name || "",
        gender: person.gender || "male",
        birth_date: person.birth_date ? person.birth_date.slice(0, 10) : "",
        death_date: person.death_date ? person.death_date.slice(0, 10) : "",
        email: person.email || "",
        phone: person.phone || "",
        notes: person.notes || "",
      });
    }
  }, [person, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await personAPI.update(person.id, data);
        toast.success("Person updated");
      } else {
        await personAPI.create(data);
        toast.success("Person created");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? "Edit Person" : "Add New Person"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input {...register("first_name")} placeholder="John" className={`${inputClass} pl-10`} />
              </div>
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input {...register("last_name")} placeholder="Doe" className={inputClass} />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className={labelClass}>Gender</label>
            <div className="flex gap-3">
              {["male", "female"].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={g} {...register("gender")}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500/20" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Birth Date
              </label>
              <input type="date" {...register("birth_date")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Death Date
              </label>
              <input type="date" {...register("death_date")} className={inputClass} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Mail className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Email
              </label>
              <input type="email" {...register("email")} placeholder="john@example.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Phone
              </label>
              <input type="text" {...register("phone")} placeholder="+62..." className={inputClass} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Notes
            </label>
            <textarea {...register("notes")} rows={3} placeholder="Optional notes..."
              className={`${inputClass} h-auto py-2.5 resize-none`} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-60">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Save Changes" : "Create Person"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
