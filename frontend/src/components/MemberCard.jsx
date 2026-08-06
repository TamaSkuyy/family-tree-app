import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { TreePine, Mail, Cake, Users, Pencil, Trash2 } from "lucide-react";

const GENDER_CONFIG = {
  male: { header: "from-blue-500 to-blue-600", badge: "bg-blue-50 text-blue-700", icon: "♂" },
  female: { header: "from-pink-500 to-rose-500", badge: "bg-pink-50 text-pink-700", icon: "♀" },
};

export default function MemberCard({ person, onEdit, onDelete }) {
  const cfg = GENDER_CONFIG[person.gender] || { header: "from-purple-400 to-purple-500", badge: "bg-purple-50 text-purple-700", icon: "" };

  const born = person.birth_date
    ? new Date(person.birth_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const died = person.death_date
    ? new Date(person.death_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const totalRelations =
    (person.parents?.length || 0) +
    (person.children?.length || 0) +
    (person.spouses?.length || 0);

  const initials = `${person.first_name?.charAt(0) || ""}${person.last_name?.charAt(0) || ""}`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden
        hover:shadow-xl transition-shadow duration-300"
    >
      {/* Colored gender header */}
      <div className={`h-14 bg-gradient-to-br ${cfg.header} relative`}>
        {died && (
          <span className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white backdrop-blur-sm">
            Deceased
          </span>
        )}
      </div>

      {/* Avatar — centered, overlapping */}
      <div className="flex justify-center -mt-9 relative z-10">
        <div className={`w-[72px] h-[72px] rounded-full bg-gradient-to-br ${cfg.header}
          border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center`}>
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-3 text-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
          {person.first_name} {person.last_name}
        </h3>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
          {cfg.icon} {person.gender === "male" ? "Male" : person.gender === "female" ? "Female" : "Other"}
        </span>

        {/* Info */}
        <div className="mt-4 space-y-1.5 text-left">
          {born && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Cake className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 flex-shrink-0" />
              <span>{died ? `Born ${born}` : `Born ${born}`}</span>
            </div>
          )}
          {died && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="w-3.5 flex-shrink-0 text-center text-[10px]">✝</span>
              <span>Died {died}</span>
            </div>
          )}
          {person.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 flex-shrink-0" />
              <span className="truncate">{person.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300 flex-shrink-0" />
            <span>{totalRelations} relationship{totalRelations !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
        <Link
          to={`/family-tree/${person.id}`}
          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
        >
          <TreePine className="w-4 h-4" /> View Tree
        </Link>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit?.(person)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-700 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete?.(person)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
