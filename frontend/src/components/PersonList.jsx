import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Users, Search, X, LayoutGrid, TreePine,
  TrendingUp, Users2, Heart, UserPlus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useAuth } from "../contexts/AuthContext";
import { personAPI } from "../services/api";
import MemberCard from "./MemberCard";
import ConfirmModal from "./ConfirmModal";
import PersonFormModal from "./PersonFormModal";
import toast from "react-hot-toast";

const itemV = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const FILTERS = [
  { key: "all", label: "All Members" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "living", label: "Living" },
  { key: "deceased", label: "Deceased" },
];

// ── Skeleton ───────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div className="h-14 bg-slate-200" />
      <div className="flex justify-center -mt-9 z-10 relative">
        <div className="w-[72px] h-[72px] rounded-full bg-slate-300 border-4 border-white" />
      </div>
      <div className="px-5 pb-5 pt-3">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-600 rounded mx-auto mb-2" />
        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-48 bg-slate-100 dark:bg-slate-700 rounded" />
          <div className="h-3 w-36 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────
function Pagination({ page, totalPages, prevPage, nextPage, goToPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button onClick={prevPage} disabled={page === 1}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200
          disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Prev
      </button>
      {pages.map((p, i) => (
        p === "..." ? (
          <span key={`dots-${i}`} className="w-10 h-10 flex items-center justify-center text-slate-400">...</span>
        ) : (
          <button key={p} onClick={() => goToPage(p)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all
              ${page === p ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}>
            {p}
          </button>
        )
      ))}
      <button onClick={nextPage} disabled={page === totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200
          disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors">
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function PersonList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchPersons = useCallback(() => {
    if (debouncedSearch) return personAPI.search(debouncedSearch);
    return personAPI.getAll();
  }, [debouncedSearch]);

  const { data: persons, error, isLoading, isEmpty, refetch } = useApi(fetchPersons, [debouncedSearch]);

  const filteredPersons = useMemo(() => {
    if (!persons) return [];
    let result = [...persons];
    switch (activeFilter) {
      case "male": result = result.filter((p) => p.gender === "male"); break;
      case "female": result = result.filter((p) => p.gender === "female"); break;
      case "living": result = result.filter((p) => !p.death_date); break;
      case "deceased": result = result.filter((p) => p.death_date); break;
    }
    return result;
  }, [persons, activeFilter]);

  const { page, totalPages, paginatedItems, nextPage, prevPage, goToPage } = usePagination(filteredPersons, 9);

  const stats = useMemo(() => {
    if (!persons) return { total: 0, living: 0 };
    return { total: persons.length, living: persons.filter((p) => !p.death_date).length };
  }, [persons]);

  const handleAdd = () => { setEditingPerson(null); setShowAddModal(true); };
  const handleEdit = (person) => { setEditingPerson(person); setShowAddModal(true); };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await personAPI.delete(deleteTarget.id); toast.success("Member removed"); refetch(); }
    catch { toast.error("Failed to delete"); }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="h-44 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Failed to load members</h3>
        <p className="text-slate-500 dark:text-slate-300 mt-1 mb-4">{error}</p>
        <button onClick={refetch} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">Try Again</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-xl shadow-emerald-500/20 p-6 sm:p-8 mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          {/* Left: Welcome */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
            </h2>
            <p className="text-white/80 mt-1.5 text-base sm:text-lg">Here&apos;s what&apos;s happening with your family tree</p>
          </div>
          {/* Right: Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users2, label: "Total Members", value: stats.total },
              { icon: Heart, label: "Living", value: stats.living },
              { icon: TrendingUp, label: "Generations", value: "1+" },
            ].map((s, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <s.icon className="w-5 h-5 text-white/70 mb-1.5" />
                <p className="text-lg sm:text-2xl font-bold text-white">{s.value}</p>
                <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION HEADER
          ══════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemV} initial="hidden" animate="visible"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Family Members</h2>
            <p className="text-sm text-slate-500">{filteredPersons.length} member{filteredPersons.length !== 1 ? "s" : ""} in your tree</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
            {[{ mode: "grid", icon: LayoutGrid }, { mode: "tree", icon: TreePine }].map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-2 rounded-lg transition-all ${viewMode === mode ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-600" : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300"}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all duration-200">
            <UserPlus className="w-4 h-4" /> Add Person
          </button>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════
          SEARCH + FILTERS (light theme)
          ══════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemV} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-4 mb-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or relationship..."
            className="w-full h-12 pl-11 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-900
              placeholder:text-slate-400 dark:text-slate-300 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pt-4 mt-4 border-t border-slate-100">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeFilter === f.key
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════
          EMPTY STATE
          ══════════════════════════════════════════════════════════════ */}
      {isEmpty || filteredPersons.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <TreePine className="w-10 h-10 text-emerald-500" />
          </div>
          {search || activeFilter !== "all" ? (
            <>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No members found</h3>
              <p className="text-slate-500 dark:text-slate-300 mt-1.5 mb-6">Try adjusting your search or filters</p>
              <button onClick={() => { setSearch(""); setActiveFilter("all"); }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 transition-colors">Clear filters</button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No family members yet</h3>
              <p className="text-slate-500 dark:text-slate-300 mt-1.5 mb-6">Start building your family tree by adding your first member</p>
              <button onClick={handleAdd}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all">
                <UserPlus className="w-5 h-5" /> Add Your First Member
              </button>
            </>
          )}
        </motion.div>
      ) : viewMode === "grid" ? (
        <>
          {/* ── CARDS GRID ──────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedItems.map((person) => (
              <MemberCard key={person.id} person={person} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </motion.div>
          <Pagination page={page} totalPages={totalPages} prevPage={prevPage} nextPage={nextPage} goToPage={goToPage} />
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm">
          <TreePine className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-300 mb-4">Select a member to view their family tree</p>
          {filteredPersons[0] && (
            <Link to={`/family-tree/${filteredPersons[0].id}`} className="text-emerald-600 hover:underline font-medium">
              View {filteredPersons[0].first_name}&apos;s tree →
            </Link>
          )}
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <PersonFormModal
          person={editingPerson}
          onClose={() => { setShowAddModal(false); setEditingPerson(null); }}
          onSaved={() => { setShowAddModal(false); setEditingPerson(null); refetch(); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Remove Member"
          message={`Are you sure you want to remove ${deleteTarget.first_name} ${deleteTarget.last_name}? This will also remove their relationships.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
