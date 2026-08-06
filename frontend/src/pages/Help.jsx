import React from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, Book, Mail, ExternalLink, TreePine, Users, Shield } from "lucide-react";

const itemV = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const faqs = [
  { q: "How do I add a family member?", a: "Click the '+ Add Person' button on the dashboard. Fill in their name, gender, and optional details like birth date and email." },
  { q: "How do I create relationships?", a: "Go to a person's family tree page, click 'Add Relationship', choose the type (parent/child or spouse), and select the related person. Siblings are detected automatically when people share parents." },
  { q: "How do I view a family tree?", a: "Click 'View Tree' on any member card, or use ⌘K (Ctrl+K) to search and jump to anyone's tree. You can also use the interactive tree visualization with zoom and pan." },
  { q: "What do the colors mean?", a: "Blue = Male, Pink = Female, Purple = Other. In the tree view, the root person has an emerald ring. Spouse connectors are dashed pink." },
  { q: "Is my data private?", a: "Yes! Your family tree is private by default. Only people you share it with can view it. All passwords are encrypted with bcrypt." },
  { q: "How do I change my password?", a: "Click your avatar in the top-right → Profile → Change Password. Enter your current password and your new one." },
];

export default function Help() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Hero */}
      <motion.div variants={itemV} initial="hidden" animate="visible"
        className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/20 p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-white/20">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Help & Support</h2>
            <p className="text-white/80 mt-1">Everything you need to know about Family Tree</p>
          </div>
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div variants={itemV} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 dark:bg-amber-950 rounded-lg">
            <Book className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Frequently Asked Questions</h3>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{faq.q}</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1.5 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick links */}
      <motion.div variants={itemV} initial="hidden" animate="visible" transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TreePine, label: "Dashboard", to: "/", color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" },
          { icon: Users, label: "Members", to: "/", color: "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400" },
          { icon: Shield, label: "Profile", to: "/profile", color: "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400" },
        ].map((link, i) => (
          <Link key={i} to={link.to}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4
              hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 transition-all flex items-center gap-3 group">
            <div className={`p-2.5 rounded-lg ${link.color}`}>
              <link.icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 transition-colors">{link.label}</span>
          </Link>
        ))}
      </motion.div>

      {/* Contact */}
      <motion.div variants={itemV} initial="hidden" animate="visible" transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Contact Us</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="mailto:support@familytree.app"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
            <Mail className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Email Support</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">support@familytree.app</p>
            </div>
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-all">
            <ExternalLink className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">GitHub</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">View source & report issues</p>
            </div>
          </a>
        </div>
      </motion.div>

    </div>
  );
}
