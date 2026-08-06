import React from "react";
import { Link } from "react-router-dom";
import { TreePine, User, HelpCircle, Mail, Cake, Users, Pencil, Trash2 } from "lucide-react";

const GENDER_CONFIG = {
  male: {
    header: "from-blue-400 to-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
    iconLabel: "♂ Male",
  },
  female: {
    header: "from-pink-400 to-pink-600",
    badge: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400",
    iconLabel: "♀ Female",
  },
};

export default function MemberCard({ person, onEdit, onDelete }) {
  const genderCfg = GENDER_CONFIG[person.gender] || {
    header: "from-purple-400 to-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400",
    iconLabel: "Other",
  };

  const born = person.birth_date ? new Date(person.birth_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;
  const died = person.death_date ? new Date(person.death_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;
  const isDeceased = !!person.death_date;

  const parentCount = person.parent_relationships?.length || 0;
  const childCount = person.child_relationships?.length || 0;
  const spouseCount = person.spouse_relationships?.length || 0;
  const totalRelations = parentCount + childCount + spouseCount;

  return (
    <div
      className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700
        shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      {/* Gender header */}
      <div className={`h-16 bg-gradient-to-r ${genderCfg.header} relative`}>
        {isDeceased && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium
            bg-white/20 text-white backdrop-blur-sm">
            Deceased
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="px-5 -mt-10 mb-3">
        <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-800
          shadow-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700
          flex items-center justify-center text-2xl font-bold text-slate-500 dark:text-slate-300
          ring-1 ring-black/5">
          {person.first_name?.charAt(0)}{person.last_name?.charAt(0)}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {person.first_name} {person.last_name}
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${genderCfg.badge}`}>
          {genderCfg.iconLabel}
        </span>

        {/* Info */}
        <div className="mt-3 space-y-1.5">
          {born && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Cake className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{isDeceased ? `Born ${born}` : `Born ${born}`}</span>
            </div>
          )}
          {died && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="w-3.5 h-3.5 flex-shrink-0 text-center text-xs">✝</span>
              <span>Died {died}</span>
            </div>
          )}
          {person.email && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{person.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{totalRelations} relationship{totalRelations !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-stretch border-t border-slate-100 dark:border-slate-700">
        <Link
          to={`/family-tree/${person.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium
            text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20
            transition-colors"
        >
          <TreePine className="w-4 h-4" /> View Tree
        </Link>
        <div className="w-px bg-slate-100 dark:bg-slate-700" />
        <button
          onClick={() => onEdit?.(person)}
          className="flex items-center justify-center gap-1 px-3 py-3 text-sm text-slate-500
            hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
            hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete?.(person)}
          className="flex items-center justify-center gap-1 px-3 py-3 text-sm text-slate-500
            hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
