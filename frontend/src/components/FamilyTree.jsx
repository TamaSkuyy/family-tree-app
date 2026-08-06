import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Link2, Heart, User, Users, UserPlus, ChevronRight, Cake, Loader2,
  Search, X, Check, Trash2, ChevronDown,
} from "lucide-react";
import { personAPI, relationshipAPI } from "../services/api";
import TreeView from "./TreeView";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════
// SEARCHABLE SELECT (Select2-style)
// ═══════════════════════════════════════════════════════════════════════
function SearchableSelect({ options, value, onChange, placeholder, excludeIds = [] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, flip: false });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Position dropdown relative to trigger on open
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownH = 300; // max dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < dropdownH && rect.top > dropdownH;
    setPos({
      top: flip ? rect.top - 8 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      flip,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = options.filter(
    (o) => !excludeIds.includes(o.id) &&
      `${o.first_name} ${o.last_name} ${o.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((o) => o.id === value);

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: pos.flip ? 4 : -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            top: pos.flip ? "auto" : pos.top,
            bottom: pos.flip ? window.innerHeight - pos.top : "auto",
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden"
        >
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..." autoFocus
              className="w-full h-10 pl-9 pr-8 text-sm outline-none bg-transparent"
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-300 text-center py-4">No results found</p>
            ) : (
              filtered.map((o) => (
                <button key={o.id} type="button"
                  onClick={() => { onChange(o.id); setOpen(false); setSearch(""); }}
                  className={`w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:bg-slate-800/50 transition-colors flex items-center justify-between
                    ${value === o.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-700 dark:text-slate-300"}`}>
                  <span>{o.first_name} {o.last_name}</span>
                  {value === o.id && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen(!open); updatePosition(); }}
        className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 pr-8 text-left text-sm
          flex items-center gap-2 hover:border-slate-300 transition-colors outline-none
          focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 relative"
      >
        {selected ? (
          <span className="text-slate-900 dark:text-slate-100 truncate">{selected.first_name} {selected.last_name}</span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-300 ml-auto flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {createPortal(dropdown, document.body)}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PERSON CARD
// ═══════════════════════════════════════════════════════════════════════
function PersonCard({ person, onClick, onDelete }) {
  const genderColor =
    person.gender === "male"
      ? { bg: "bg-blue-50", icon: "text-blue-600" }
      : { bg: "bg-pink-50", icon: "text-pink-600" };

  return (
    <motion.div whileHover={{ y: -2 }}
      className="bg-slate-50 hover:bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4
        flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all group relative">
      <div onClick={onClick} className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
        <div className={`w-10 h-10 rounded-full ${genderColor.bg} flex items-center justify-center flex-shrink-0`}>
          <User className={`w-5 h-5 ${genderColor.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
            {person.first_name} {person.last_name}
          </p>
          {person.birth_date && (
            <p className="text-xs text-slate-500">
              {new Date(person.birth_date).getFullYear()}
              {person.death_date && ` – ${new Date(person.death_date).getFullYear()}`}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-300 flex-shrink-0 transition-colors" />
      </div>
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
          title="Remove relationship">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════
function EmptyState({ icon: Icon, label, subtext, onAdd }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
      <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">{label}</p>
      <p className="text-slate-400 dark:text-slate-300 text-xs mt-1">{subtext}</p>
      {onAdd && (
        <button onClick={onAdd} className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          + Add
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RELATIONSHIP FORM MODAL
// ═══════════════════════════════════════════════════════════════════════
function RelationshipForm({ currentPerson, onClose, onAddRelationship }) {
  const [allPersons, setAllPersons] = useState([]);
  const [type, setType] = useState("parent-child");
  const [direction, setDirection] = useState("parent"); // "parent" = currentPerson is parent of selected, "child" = currentPerson is child of selected
  const [relatedId, setRelatedId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    personAPI.getAll().then((r) => {
      setAllPersons((r?.data?.data || []).filter((p) => p.id !== currentPerson.id));
    }).catch(() => {});
  }, [currentPerson]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!relatedId) { toast.error("Please select a person"); return; }
    setSubmitting(true);
    try {
      if (type === "parent-child") {
        if (direction === "parent") {
          await relationshipAPI.addParentChild(currentPerson.id, relatedId);
        } else {
          await relationshipAPI.addParentChild(relatedId, currentPerson.id);
        }
        toast.success("Relationship added");
      } else {
        await relationshipAPI.addSpouse(currentPerson.id, relatedId);
        toast.success("Spouse added");
      }
      onAddRelationship();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to add relationship");
    } finally { setSubmitting(false); }
  };

  // Exclude existing relations from selectable persons
  const existingParentIds = currentPerson.parents?.map((p) => p.id) || [];
  const existingChildIds = currentPerson.children?.map((p) => p.id) || [];
  const existingSpouseIds = currentPerson.spouses?.map((p) => p.id) || [];
  const excludeIds = type === "parent-child"
    ? (direction === "parent" ? existingChildIds : existingParentIds)
    : existingSpouseIds;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add Relationship</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Relationship Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "parent-child", label: "Parent / Child", icon: Users },
                { key: "spouse", label: "Spouse", icon: Heart },
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => { setType(t.key); setRelatedId(""); }}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-medium transition-all
                    ${type === t.key
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"}`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Direction (only for parent-child) */}
          {type === "parent-child" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {currentPerson.first_name} is the...
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "parent", label: "Parent of", desc: `${currentPerson.first_name} → selected` },
                  { key: "child", label: "Child of", desc: `selected → ${currentPerson.first_name}` },
                ].map((d) => (
                  <button key={d.key} type="button" onClick={() => { setDirection(d.key); setRelatedId(""); }}
                    className={`h-11 rounded-xl border-2 text-sm font-medium transition-all
                      ${direction === d.key
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"}`}>
                    {d.label}
                    <span className="block text-[10px] text-slate-400 dark:text-slate-300 font-normal">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Searchable person select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {type === "spouse" ? "Spouse" : direction === "parent" ? "Child" : "Parent"}
            </label>
            <SearchableSelect
              options={allPersons}
              value={relatedId}
              onChange={setRelatedId}
              placeholder={`Select a ${type === "spouse" ? "spouse" : "person"}...`}
              excludeIds={excludeIds}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !relatedId}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-60">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Add Relationship
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function FamilyTree({ personId }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);

  const fetchFamilyTree = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await personAPI.getFamilyTree(id);
      setTreeData(response.data.data);
      setSelectedPerson(response.data.data);
    } catch { toast.error("Failed to load family tree"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (personId) fetchFamilyTree(personId);
  }, [personId, fetchFamilyTree]);

  const handleDeleteRelationship = async (type, id1, id2) => {
    try {
      if (type === "parent-child") {
        await relationshipAPI.removeParentChild(id1, id2);
      } else {
        await relationshipAPI.removeSpouse(id1, id2);
      }
      toast.success("Relationship removed");
      fetchFamilyTree(personId);
    } catch { toast.error("Failed to remove relationship"); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No family tree data found</h3>
        <Link to="/" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">Back to members</Link>
      </div>
    );
  }

  const genderCfg = selectedPerson?.gender === "male"
    ? { bg: "from-blue-500 to-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: "♂" }
    : { bg: "from-pink-500 to-rose-500", badge: "bg-pink-50 text-pink-700 border-pink-200", icon: "♀" };

  const initials = `${selectedPerson?.first_name?.charAt(0) || ""}${selectedPerson?.last_name?.charAt(0) || ""}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb + Title */}
      <div className="space-y-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><Users className="w-7 h-7 text-emerald-600" /></div>
          Family Tree
        </h1>
      </div>

      {/* Profile Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${genderCfg.bg} border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0`}>
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedPerson?.first_name} {selectedPerson?.last_name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${genderCfg.badge}`}>
              {genderCfg.icon} {selectedPerson?.gender === "male" ? "Male" : "Female"}
            </span>
            {selectedPerson?.birth_date && (
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <Cake className="w-4 h-4 text-slate-400" />
                Born {new Date(selectedPerson.birth_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setShowRelationshipForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex-shrink-0">
          <Link2 className="w-4 h-4" /> Add Relationship
        </button>
      </motion.div>

      {/* Interactive Tree Visualization */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <TreeView person={selectedPerson} onNavigate={(p) => fetchFamilyTree(p.id)} />
      </motion.div>

      {/* Family Relationships */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 sm:p-8 space-y-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Family Relationships</h2>

        {/* Parents */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <div className="p-1.5 bg-blue-50 rounded-lg"><Users className="w-4 h-4 text-blue-600" /></div>
            Parents
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
              {selectedPerson?.parents?.length || 0}
            </span>
          </h3>
          {selectedPerson?.parents?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedPerson.parents.map((person) => (
                <PersonCard key={person.id} person={person}
                  onClick={() => fetchFamilyTree(person.id)}
                  onDelete={() => handleDeleteRelationship("parent-child", person.id, selectedPerson.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} label="No parents recorded" subtext="Add a parent" onAdd={() => setShowRelationshipForm(true)} />
          )}
        </section>

        {/* Spouses */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <div className="p-1.5 bg-pink-50 rounded-lg"><Heart className="w-4 h-4 text-pink-600" /></div>
            Spouses
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
              {selectedPerson?.spouses?.length || 0}
            </span>
          </h3>
          {selectedPerson?.spouses?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedPerson.spouses.map((person) => (
                <PersonCard key={person.id} person={person}
                  onClick={() => fetchFamilyTree(person.id)}
                  onDelete={() => handleDeleteRelationship("spouse", selectedPerson.id, person.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Heart} label="No spouses recorded" subtext="Add a spouse" onAdd={() => setShowRelationshipForm(true)} />
          )}
        </section>

        {/* Siblings */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <div className="p-1.5 bg-amber-50 rounded-lg"><Users className="w-4 h-4 text-amber-600" /></div>
            Siblings
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
              {selectedPerson?.siblings?.length || 0}
            </span>
          </h3>
          {selectedPerson?.siblings?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedPerson.siblings.map((person) => (
                <PersonCard key={person.id} person={person} onClick={() => fetchFamilyTree(person.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} label="No siblings recorded" subtext="Siblings share the same parents" />
          )}
        </section>

        {/* Children */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <div className="p-1.5 bg-emerald-50 rounded-lg"><UserPlus className="w-4 h-4 text-emerald-600" /></div>
            Children
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
              {selectedPerson?.children?.length || 0}
            </span>
          </h3>
          {selectedPerson?.children?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedPerson.children.map((person) => (
                <PersonCard key={person.id} person={person}
                  onClick={() => fetchFamilyTree(person.id)}
                  onDelete={() => handleDeleteRelationship("parent-child", selectedPerson.id, person.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={UserPlus} label="No children recorded" subtext="Add a child" onAdd={() => setShowRelationshipForm(true)} />
          )}
        </section>
      </motion.div>

      {/* Relationship Form Modal */}
      <AnimatePresence>
        {showRelationshipForm && (
          <RelationshipForm
            currentPerson={selectedPerson}
            onClose={() => setShowRelationshipForm(false)}
            onAddRelationship={() => { setShowRelationshipForm(false); fetchFamilyTree(personId); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
