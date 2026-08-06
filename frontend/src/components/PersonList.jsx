import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, Plus, Search, X, LayoutGrid, TreePine,
  TrendingUp, Users2, Heart, UserPlus,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { usePagination } from "../hooks/usePagination";
import { useDebounce } from "../hooks/useDebounce";
import { useAuth } from "../contexts/AuthContext";
import { personAPI } from "../services/api";
import MemberCard from "./MemberCard";
import ConfirmModal from "./ConfirmModal";
import UserModal from "./UserModal";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-white/70 text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════════
function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="h-16 bg-slate-200 dark:bg-slate-700" />
      <div className="px-5 -mt-10 mb-3">
        <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-800 bg-slate-300 dark:bg-slate-600" />
      </div>
      <div className="px-5 pb-5 space-y-2">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded-full" />
        <div className="h-3 w-48 bg-slate-100 dark:bg-slate-700 rounded mt-3" />
        <div className="h-3 w-40 bg-slate-100 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════════════
const FILTERS = [
  { key: "all", label: "All Members" },
  { key: "male", label: "Male", icon: "♂" },
  { key: "female", label: "Female", icon: "♀" },
  { key: "living", label: "Living" },
  { key: "deceased", label: "Deceased" },
];

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

  // ── Filter ────────────────────────────────────────────────────────
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

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!persons) return { total: 0, living: 0 };
    return { total: persons.length, living: persons.filter((p) => !p.death_date).length };
  }, [persons]);

  // ── Actions ───────────────────────────────────────────────────────
  const handleAdd = () => { setEditingPerson(null); setShowAddModal(true); };
  const handleEdit = (person) => { setEditingPerson(person); setShowAddModal(true); };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await personAPI.delete(deleteTarget.id); toast.success("Member removed"); refetch(); }
    catch { toast.error("Failed to delete"); }
    setDeleteTarget(null);
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="h-48 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load members</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4">{error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">Try Again</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════════════════
          HERO / STATS BAR
          ══════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600
        shadow-xl shadow-emerald-500/20 p-6 sm:p-8 mb-8 overflow-hidden"
        style={{ animation: "fadeInUp 0.5s both" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
            </h2>
            <p className="text-white/80 mt-1.5 text-lg">Here's what's happening with your family tree</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Users2} label="Total Members" value={stats.total} color="bg-white/20" />
            <StatCard icon={Heart} label="Living" value={stats.living} color="bg-white/20" />
            <StatCard icon={TrendingUp} label="Generations" value="1+" color="bg-white/20" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          HEADER + ACTIONS
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" style={{ animation: "fadeInUp 0.5s 0.1s both" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Family Members</h3>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {filteredPersons.length} member{filteredPersons.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {[{ mode: "grid", icon: LayoutGrid }, { mode: "tree", icon: TreePine }].map(({ mode, icon: Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-2 rounded-lg transition-all ${viewMode === mode ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] transition-all duration-200">
            <UserPlus className="w-4 h-4" /> Add Person
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEARCH + FILTERS
          ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-6 space-y-3" style={{ animation: "fadeInUp 0.5s 0.2s both" }}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or relationship..."
            className="w-full h-12 pl-11 pr-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeFilter === f.key
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
              {f.icon && <span className="mr-1">{f.icon}</span>}{f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CARDS / EMPTY
          ══════════════════════════════════════════════════════════════ */}
      {isEmpty || filteredPersons.length === 0 ? (
        <div className="text-center py-20" style={{ animation: "fadeInUp 0.5s 0.3s both" }}>
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
            <TreePine className="w-10 h-10 text-emerald-500" />
          </div>
          {search || activeFilter !== "all" ? (
            <>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No members found</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 mb-6">Try adjusting your search or filters</p>
              <button onClick={() => { setSearch(""); setActiveFilter("all"); }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Clear filters</button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No family members yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 mb-6">Start building your family tree by adding your first member</p>
              <button onClick={handleAdd}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all">
                <UserPlus className="w-5 h-5" /> Add Your First Member
              </button>
            </>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ animation: "fadeInUp 0.5s 0.3s both" }}>
            {paginatedItems.map((person) => (
              <MemberCard key={person.id} person={person} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8" style={{ animation: "fadeInUp 0.5s 0.4s both" }}>
              <button onClick={prevPage} disabled={page === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => goToPage(i + 1)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${page === i + 1 ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={nextPage} disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Next</button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700" style={{ animation: "fadeInUp 0.5s 0.3s both" }}>
          <TreePine className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 mb-4">Select a member to view their family tree</p>
          {filteredPersons[0] && (
            <Link to={`/family-tree/${filteredPersons[0].id}`}
              className="text-emerald-600 hover:underline font-medium">View {filteredPersons[0].first_name}&apos;s tree →</Link>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <UserModal
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
